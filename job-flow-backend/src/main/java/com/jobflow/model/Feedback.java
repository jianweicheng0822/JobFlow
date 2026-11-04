package com.jobflow.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** A bug report, idea or other note sent from the feedback form. */
@Entity
@Table(name = "feedback")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    public static final int MESSAGE_MAX = 1000;
    public static final int EMAIL_MAX = 254;
    public static final int PAGE_URL_MAX = 500;
    public static final int USER_AGENT_MAX = 300;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private FeedbackType type;

    @Column(nullable = false, length = MESSAGE_MAX)
    private String message;

    // Optional, only if the sender wants a reply
    @Column(length = EMAIL_MAX)
    private String email;

    // Set when the sender was logged in
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // The page the form was opened on, to help reproduce bugs
    @Column(name = "page_url", length = PAGE_URL_MAX)
    private String pageUrl;

    @Column(name = "user_agent", length = USER_AGENT_MAX)
    private String userAgent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
