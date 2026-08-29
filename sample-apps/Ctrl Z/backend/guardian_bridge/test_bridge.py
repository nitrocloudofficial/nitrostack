"""Unit tests for the Guardian Bridge parsing and validation pipeline."""

import os
import struct
import sys
import tempfile
import unittest
from unittest import mock

os.environ.setdefault("GUARDIAN_LOG_FILE", os.path.join(tempfile.gettempdir(), "guardian_test.log"))
os.environ.setdefault("GUARDIAN_BACKEND_URL", "http://localhost:1/api")

from api_client import _request_with_retry
from binary_parser import BinaryCSIParser, HEADER_FMT, HEADER_SIZE, MAGIC
from csi_parser import CSIParser
from health_metrics import DropAwareQueue, MetricsTracker
from packet_validator import PacketValidator

S3_MAC = "1a:00:00:00:00:00"

S3_LINE = (
    'CSI_DATA,0,1a:00:00:00:00:00,-26,7,1,7,1,1,0,1,0,0,1,-90,0,11,0,'
    '12345,0,3,0,3,0,"[10,-20,30]"'
)

C5C6_LINE = (
    'CSI_DATA,0,1a:00:00:00:00:00,-26,7,-90,1,2,11,12345,3,0,3,0,"[10,-20,30]"'
)


class CsiParserTest(unittest.TestCase):
    def test_parses_s3_schema(self):
        packet = CSIParser.parse(S3_LINE)
        self.assertIsNotNone(packet)
        self.assertEqual(packet["packet_type"], "CSI_DATA")
        self.assertEqual(packet["mac"], S3_MAC)
        self.assertEqual(packet["rssi"], -26)
        self.assertEqual(packet["channel"], 11)
        self.assertEqual(packet["schema"], "s3")
        self.assertEqual(packet["csi"], [10, -20, 30])
        self.assertEqual(packet["mcs"], 7)
        self.assertEqual(packet["sig_mode"], 1)
        self.assertEqual(packet["secondary_channel"], 0)
        self.assertEqual(packet["len"], 3)

    def test_parses_c5c6_schema(self):
        packet = CSIParser.parse(C5C6_LINE)
        self.assertIsNotNone(packet)
        self.assertEqual(packet["schema"], "c5c6")
        self.assertEqual(packet["agc_gain"], 2)
        self.assertEqual(packet["fft_gain"], 1)
        self.assertEqual(packet["csi"], [10, -20, 30])

    def test_parses_bytes_input(self):
        self.assertIsNotNone(CSIParser.parse(S3_LINE.encode("utf-8")))

    def test_rejects_non_csi_lines(self):
        self.assertIsNone(CSIParser.parse("hello world"))
        self.assertIsNone(CSIParser.parse(""))

    def test_rejects_wrong_field_count(self):
        line = S3_LINE + ",extra"
        self.assertIsNone(CSIParser.parse(line))

    def test_rejects_invalid_mac(self):
        line = S3_LINE.replace(S3_MAC, "zz:00:00:00:00:00")
        self.assertIsNone(CSIParser.parse(line))

    def test_rejects_csi_length_mismatch(self):
        # Change the header `len` field (fields[-3]) from 3 to 9
        line = S3_LINE.replace('3,0,"[10,-20,30]"', '9,0,"[10,-20,30]"')
        self.assertIsNone(CSIParser.parse(line))

    def test_rejects_empty_array(self):
        line = S3_LINE.replace("[10,-20,30]", "[]")
        self.assertIsNone(CSIParser.parse(line))

    def test_rejects_non_integer_csi_values(self):
        line = S3_LINE.replace("[10,-20,30]", "[10,-20,x]")
        self.assertIsNone(CSIParser.parse(line))

    def test_rejects_out_of_range_rssi(self):
        line = S3_LINE.replace(",-26,", ",50,")
        self.assertIsNone(CSIParser.parse(line))


class PacketValidatorTest(unittest.TestCase):
    def test_accepts_valid_line(self):
        self.assertTrue(PacketValidator.is_valid(S3_LINE))

    def test_rejects_missing_prefix(self):
        self.assertFalse(PacketValidator.is_valid("DATA,0,1,"))

    def test_rejects_unbalanced_brackets(self):
        line = S3_LINE.replace("]", "] extra [")
        self.assertFalse(PacketValidator.is_valid(line))

    def test_rejects_empty(self):
        self.assertFalse(PacketValidator.is_valid(""))

    def test_rejects_oversized_line(self):
        self.assertFalse(PacketValidator.is_valid("CSI_DATA," + "x" * 100000))


def _build_binary_frame(csi, checksum_override=None):
    payload = struct.pack(
        HEADER_FMT,
        MAGIC,
        1,
        42,
        -30,
        11,
        -90,
        3,
        2,
        len(csi),
        123456,
    )
    payload += struct.pack(f"<{len(csi)}h", *csi)
    checksum = checksum_override
    if checksum is None:
        checksum = sum(payload) & 0xFFFF
    payload += struct.pack("<H", checksum)
    return payload


class BinaryCsiParserTest(unittest.TestCase):
    def test_parses_complete_frame(self):
        frame = _build_binary_frame([10, -20, 30])
        packets = BinaryCSIParser().feed(frame)
        self.assertEqual(len(packets), 1)
        self.assertEqual(packets[0]["csi"], [10, -20, 30])
        self.assertEqual(packets[0]["rssi"], -30)
        self.assertEqual(packets[0]["channel"], 11)

    def test_reassembles_split_frame(self):
        frame = _build_binary_frame([1, 2, 3, 4])
        parser = BinaryCSIParser()
        self.assertEqual(parser.feed(frame[: len(frame) // 2]), [])
        packets = parser.feed(frame[len(frame) // 2 :])
        self.assertEqual(len(packets), 1)
        self.assertEqual(packets[0]["csi"], [1, 2, 3, 4])

    def test_rejects_bad_checksum(self):
        frame = _build_binary_frame([10, -20, 30], checksum_override=0)
        self.assertEqual(BinaryCSIParser().feed(frame), [])

    def test_resyncs_from_garbage(self):
        frame = _build_binary_frame([5, 6])
        noisy = b"\x00\xffgarbage" + frame
        packets = BinaryCSIParser().feed(noisy)
        self.assertEqual(len(packets), 1)
        self.assertEqual(packets[0]["csi"], [5, 6])


class DropAwareQueueTest(unittest.TestCase):
    def test_tracks_drops(self):
        metrics = MetricsTracker()
        queue = DropAwareQueue(maxsize=2, metrics=metrics, drop_field="raw_queue_drops")
        self.assertTrue(queue.put("a", timeout=0.1))
        self.assertTrue(queue.put("b", timeout=0.1))
        self.assertFalse(queue.put("c", timeout=0.1))
        self.assertEqual(metrics.snapshot()["raw_queue_drops"], 1)


class ApiRetryTest(unittest.TestCase):
    def test_non_retryable_status_returns_immediately(self):
        response = mock.Mock()
        response.ok = False
        response.status_code = 400
        response.text = "bad request"

        with mock.patch("api_client.requests.request", return_value=response) as req:
            result = _request_with_retry("POST", "http://test/api")
            self.assertIsNotNone(result)
            self.assertEqual(req.call_count, 1)

    def test_retryable_status_retries_then_returns_none(self):
        response = mock.Mock()
        response.ok = False
        response.status_code = 503
        response.text = "unavailable"

        with mock.patch("api_client.requests.request", return_value=response) as req:
            with mock.patch("api_client.time.sleep"):
                result = _request_with_retry("POST", "http://test/api")
        self.assertIsNone(result)
        self.assertEqual(req.call_count, 3)

    def test_success_returns_response(self):
        response = mock.Mock()
        response.ok = True
        with mock.patch("api_client.requests.request", return_value=response) as req:
            result = _request_with_retry("GET", "http://test/api")
        self.assertIs(response, result)
        self.assertEqual(req.call_count, 1)


if __name__ == "__main__":
    result = unittest.main(verbosity=2, exit=False)
    sys.exit(0 if result.result.wasSuccessful() else 1)
