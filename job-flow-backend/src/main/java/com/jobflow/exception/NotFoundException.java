package com.jobflow.exception;

import java.util.Map;

// 404. Code and params let the frontend say what wasn't found in the user's language.
public class NotFoundException extends RuntimeException {

    private final String code;
    private final Map<String, Object> params;

    public NotFoundException(String message) {
        this("NOT_FOUND", message, Map.of());
    }

    public NotFoundException(String code, String message, Map<String, Object> params) {
        super(message);
        this.code = code;
        this.params = params == null ? Map.of() : Map.copyOf(params);
    }

    public static NotFoundException application(Long id) {
        return new NotFoundException("APPLICATION_NOT_FOUND", "Job application not found: " + id, idParam(id));
    }

    public static NotFoundException company(Long id) {
        return new NotFoundException("COMPANY_NOT_FOUND", "Company not found: " + id, idParam(id));
    }

    public static NotFoundException interview(Long id) {
        return new NotFoundException("INTERVIEW_NOT_FOUND", "Interview not found: " + id, idParam(id));
    }

    public static NotFoundException user() {
        return new NotFoundException("USER_NOT_FOUND", "User not found", Map.of());
    }

    private static Map<String, Object> idParam(Long id) {
        return id == null ? Map.of() : Map.of("id", id);
    }

    public String getCode() {
        return code;
    }

    public Map<String, Object> getParams() {
        return params;
    }
}
