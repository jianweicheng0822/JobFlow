package com.jobflow.dto;

import com.jobflow.model.Feedback;
import com.jobflow.model.FeedbackType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FeedbackRequest {

    public static final int MESSAGE_MIN = 5;

    @NotNull(message = "Feedback type is required")
    private FeedbackType type;

    @NotBlank(message = "Feedback message is required")
    @Size(min = MESSAGE_MIN, max = Feedback.MESSAGE_MAX,
            message = "Feedback must be 5 to 1000 characters")
    private String message;

    // Optional reply address
    @Email(message = "Invalid email format")
    @Size(max = Feedback.EMAIL_MAX, message = "Email must be at most 254 characters")
    private String email;

    // Not validated: it's only a hint for reproducing bugs, so it gets truncated instead
    private String pageUrl;

    // Honeypot: the form hides this field from people, so only bots fill it in
    private String website;

    public boolean isFromBot() {
        return website != null && !website.isBlank();
    }
}
