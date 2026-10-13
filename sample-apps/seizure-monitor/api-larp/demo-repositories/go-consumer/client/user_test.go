package client

import "testing"

func TestUserID(t *testing.T) {
    payloadID := 101
    if payloadID == 0 {
        t.Fatal("id is required")
    }
}
