package com.jobflow.exception;

// A third-party service (e.g. Gmail) failed or couldn't be reached. Maps to 502.
// The message is shown to the user, so keep provider details in the cause, not here.
public class ExternalServiceException extends RuntimeException {

    private final String code;

    public ExternalServiceException(String message, Throwable cause) {
        this("EXTERNAL_SERVICE_UNAVAILABLE", message, cause);
    }

    public ExternalServiceException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
