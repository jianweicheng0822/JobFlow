package com.jobflow.util;

public final class TextUtils {

    private TextUtils() {}

    // "  " and "" become null so optional fields never store invisible junk
    public static String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
