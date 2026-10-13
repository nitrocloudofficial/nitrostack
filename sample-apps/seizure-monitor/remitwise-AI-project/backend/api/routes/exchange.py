"""
RemitWise AI – Route: Exchange Rates
=======================================
Exposes live exchange-rate data from the Frankfurter API.

Endpoints
---------
GET /exchange/latest     – Latest rate between two currencies
GET /exchange/history    – Historical rates for a date range
GET /exchange/convert    – Convert a specific amount
GET /exchange/currencies – List all supported currencies
"""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query, status
from requests.exceptions import ConnectionError, HTTPError, Timeout

from services import exchange_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/exchange", tags=["Exchange Rates"])


# ---------------------------------------------------------------------------
# GET /exchange/latest
# ---------------------------------------------------------------------------

@router.get(
    "/latest",
    summary="Latest Exchange Rate",
    description=(
        "Fetch the current mid-market exchange rate between two currencies "
        "using the Frankfurter API. Returns the rate, date, and source."
    ),
)
def get_latest_rate(
    base: str = Query(..., description="Source currency code (e.g. USD)", examples=["USD"]),
    target: str = Query(..., description="Target currency code (e.g. INR)", examples=["INR"]),
) -> Dict[str, Any]:
    """Return the latest exchange rate for the given currency pair."""
    try:
        return exchange_service.get_latest_rate(base=base, target=target)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Timeout:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Exchange rate upstream APIs timed out. Please try again later.",
        )
    except ConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"All upstream exchange rate providers failed: {str(exc)}",
        )
    except HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream API error: {exc.response.status_code if exc.response else 'Unknown'}",
        )


# ---------------------------------------------------------------------------
# GET /exchange/history
# ---------------------------------------------------------------------------

@router.get(
    "/history",
    summary="Historical Exchange Rates",
    description=(
        "Fetch historical exchange rates between two currencies for a given "
        "date range (YYYY-MM-DD). Returns a time-series map of date → rate."
    ),
)
def get_historical_rates(
    base: str = Query(..., description="Source currency code", examples=["USD"]),
    target: str = Query(..., description="Target currency code", examples=["INR"]),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)", examples=["2024-01-01"]),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)", examples=["2024-01-31"]),
) -> Dict[str, Any]:
    """Return historical exchange rates for the given currency pair and date range."""
    try:
        return exchange_service.get_historical_rates(
            base=base, target=target,
            start_date=start_date, end_date=end_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except Timeout:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Frankfurter API timed out. Please try again later.",
        )
    except ConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to reach Frankfurter API.",
        )
    except HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Currency pair '{base.upper()}/{target.upper()}' is not supported by Frankfurter API. Call /exchange/currencies to see supported currencies.",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream API error: {exc.response.status_code if exc.response else 'Unknown'}",
        )


# ---------------------------------------------------------------------------
# GET /exchange/convert
# ---------------------------------------------------------------------------

@router.get(
    "/convert",
    summary="Currency Conversion",
    description=(
        "Convert a specific monetary amount from one currency to another "
        "using the latest available exchange rate."
    ),
)
def convert_amount(
    base: str = Query(..., description="Source currency code", examples=["USD"]),
    target: str = Query(..., description="Target currency code", examples=["INR"]),
    amount: float = Query(..., description="Amount to convert (must be positive)", examples=[1000.0]),
) -> Dict[str, Any]:
    """Convert *amount* from *base* to *target* at the current rate."""
    try:
        return exchange_service.convert_amount(base=base, target=target, amount=amount)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except Timeout:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="API timeout.")
    except ConnectionError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Network error.")
    except HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Currency pair '{base.upper()}/{target.upper()}' is not supported by Frankfurter API. Call /exchange/currencies to see supported currencies.",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream API error: {exc.response.status_code if exc.response else 'Unknown'}",
        )


# ---------------------------------------------------------------------------
# GET /exchange/currencies
# ---------------------------------------------------------------------------

@router.get(
    "/currencies",
    summary="List Supported Currencies",
    description="Return all currencies available via the Frankfurter API.",
)
def list_currencies() -> Dict[str, Any]:
    """Return the full list of currencies supported by Frankfurter."""
    try:
        return exchange_service.list_supported_currencies()
    except Timeout:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="API timeout.")
    except ConnectionError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Network error.")
    except HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                            detail=f"Upstream error: {exc.response.status_code}")
