package com.jobflow.util;

public final class TextUtils {

    private TextUtils() {}

    // "  " and "" become null so optional fields never store invisible junk
    public static String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    // Cut to at most max chars without splitting an emoji/surrogate pair in half
    public static String truncate(String value, int max) {
        if (value == null || value.length() <= max) return value;
        int end = Character.isHighSurrogate(value.charAt(max - 1)) ? max - 1 : max;
        return value.substring(0, end);
    }
}
