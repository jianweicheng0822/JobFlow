package com.jobflow.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public void sendInterviewReminder(String toEmail, String companyName, String positionTitle,
                                       LocalDateTime interviewTime, String interviewType, String notes) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Interview Reminder: " + positionTitle + " at " + companyName);

        StringBuilder body = new StringBuilder();
        body.append("Hi,\n\n");
        body.append("This is a reminder for your upcoming interview:\n\n");
        body.append("Company: ").append(companyName).append("\n");
        body.append("Position: ").append(positionTitle).append("\n");
        body.append("Time: ").append(interviewTime.format(FORMATTER)).append("\n");
        body.append("Type: ").append(interviewType).append("\n");
        if (notes != null && !notes.isBlank()) {
            body.append("Notes: ").append(notes).append("\n");
        }
        body.append("\nGood luck!\n");
        body.append("— JobFlow");

        message.setText(body.toString());
        mailSender.send(message);
        log.info("Sent interview reminder to {} for {} at {}", toEmail, positionTitle, companyName);
    }
}
