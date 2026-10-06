package com.jobflow.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TextUtilsTest {

    @Test
    void blankToNull_trimsAndNullsBlanks() {
        assertThat(TextUtils.blankToNull("  hi  ")).isEqualTo("hi");
        assertThat(TextUtils.blankToNull("   ")).isNull();
        assertThat(TextUtils.blankToNull(null)).isNull();
    }

    @Test
    void truncate_leavesShortValuesAlone() {
        assertThat(TextUtils.truncate("short", 255)).isEqualTo("short");
        assertThat(TextUtils.truncate(null, 255)).isNull();
    }

    @Test
    void truncate_cutsToMax() {
        assertThat(TextUtils.truncate("abcdef", 4)).isEqualTo("abcd");
    }

    @Test
    void truncate_doesNotSplitAnEmojiInHalf() {
        // "ab" + 🚀 (two UTF-16 chars); cutting at 3 would leave half the emoji
        assertThat(TextUtils.truncate("ab\uD83D\uDE80cd", 3)).isEqualTo("ab");
    }
}
