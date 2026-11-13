"""Domain exceptions mapped to HTTP errors by a single handler."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class DomainError(Exception):
    status_code = 400

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFound(DomainError):
    status_code = 404


class InvalidTransition(DomainError):
    status_code = 409


class Unauthorized(DomainError):
    status_code = 401


class IntegrationNotConfigured(DomainError):
    status_code = 503


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _handle(_: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})
