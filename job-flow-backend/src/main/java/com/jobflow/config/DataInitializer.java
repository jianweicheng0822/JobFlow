package com.jobflow.config;

import com.jobflow.model.*;
import com.jobflow.repository.CompanyRepository;
import com.jobflow.repository.InterviewRepository;
import com.jobflow.repository.JobApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final CompanyRepository companyRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final InterviewRepository interviewRepository;

    @Override
    public void run(String... args) {
        // Skip if data already exists
        if (companyRepository.count() > 0) {
            return;
        }

        // Create companies
        Company techCorp = companyRepository.save(Company.builder()
            .name("TechCorp Inc.")
            .location("Seattle, WA")
            .website("https://techcorp.example.com")
            .build());

        Company spotify = companyRepository.save(Company.builder()
            .name("Spotify")
            .location("Stockholm")
            .website("https://spotify.com")
            .build());

        Company google = companyRepository.save(Company.builder()
            .name("Google")
            .location("Mountain View, CA")
            .website("https://google.com")
            .build());

        Company meta = companyRepository.save(Company.builder()
            .name("Meta")
            .location("Menlo Park, CA")
            .website("https://meta.com")
            .build());

        Company amazon = companyRepository.save(Company.builder()
            .name("Amazon")
            .location("Seattle, WA")
            .website("https://amazon.com")
            .build());

        // Create job applications with various statuses
        JobApplication app1 = jobApplicationRepository.save(JobApplication.builder()
            .positionTitle("Senior UX Designer")
            .company(techCorp)
            .location("Seattle, WA")
            .salary("$140,000")
            .status(ApplicationStatus.APPLIED)
            .appliedDate(LocalDate.of(2026, 6, 15))
            .lastAction("Application Submitted")
            .build());

        JobApplication app2 = jobApplicationRepository.save(JobApplication.builder()
            .positionTitle("Senior UX Designer")
            .company(spotify)
            .location("Stockholm")
            .salary("$130,000")
            .status(ApplicationStatus.IN_REVIEW)
            .appliedDate(LocalDate.of(2026, 6, 10))
            .lastAction("Interview Scheduled")
            .build());

        JobApplication app3 = jobApplicationRepository.save(JobApplication.builder()
            .positionTitle("Senior Frontend Engineer")
            .company(techCorp)
            .location("Seattle, WA")
            .salary("$160,000")
            .status(ApplicationStatus.INTERVIEW)
            .appliedDate(LocalDate.of(2026, 5, 20))
            .lastAction("Technical Interview")
            .build());

        JobApplication app4 = jobApplicationRepository.save(JobApplication.builder()
            .positionTitle("Product Designer")
            .company(google)
            .location("Mountain View, CA")
            .salary("$155,000")
            .status(ApplicationStatus.OFFER)
            .appliedDate(LocalDate.of(2026, 5, 1))
            .lastAction("Offer Received")
            .build());

        JobApplication app5 = jobApplicationRepository.save(JobApplication.builder()
            .positionTitle("UX Researcher")
            .company(meta)
            .location("Menlo Park, CA")
            .salary("$145,000")
            .status(ApplicationStatus.REJECTED)
            .appliedDate(LocalDate.of(2026, 4, 15))
            .lastAction("Rejected")
            .build());

        JobApplication app6 = jobApplicationRepository.save(JobApplication.builder()
            .positionTitle("Frontend Developer")
            .company(amazon)
            .location("Seattle, WA")
            .salary("$150,000")
            .status(ApplicationStatus.PHONE_SCREEN)
            .appliedDate(LocalDate.of(2026, 6, 1))
            .lastAction("Phone Screen Scheduled")
            .build());

        jobApplicationRepository.save(JobApplication.builder()
            .positionTitle("Senior Frontend Engineer")
            .company(spotify)
            .location("Stockholm")
            .salary("$135,000")
            .status(ApplicationStatus.PHONE_SCREEN)
            .appliedDate(LocalDate.of(2026, 6, 5))
            .lastAction("Phone Screen Completed")
            .build());

        jobApplicationRepository.save(JobApplication.builder()
            .positionTitle("UI Engineer")
            .company(google)
            .location("Mountain View, CA")
            .salary("$165,000")
            .status(ApplicationStatus.APPLIED)
            .appliedDate(LocalDate.of(2026, 7, 1))
            .lastAction("Application Submitted")
            .build());

        jobApplicationRepository.save(JobApplication.builder()
            .positionTitle("Design Systems Lead")
            .company(meta)
            .location("Menlo Park, CA")
            .salary("$170,000")
            .status(ApplicationStatus.IN_REVIEW)
            .appliedDate(LocalDate.of(2026, 6, 20))
            .lastAction("Under Review")
            .build());

        jobApplicationRepository.save(JobApplication.builder()
            .positionTitle("Full Stack Developer")
            .company(amazon)
            .location("Seattle, WA")
            .salary("$155,000")
            .status(ApplicationStatus.REJECTED)
            .appliedDate(LocalDate.of(2026, 3, 10))
            .lastAction("Rejected after interview")
            .build());

        // Create upcoming interviews
        interviewRepository.save(Interview.builder()
            .jobApplication(app3)
            .interviewDate(LocalDateTime.of(2026, 7, 18, 10, 0))
            .interviewType(InterviewType.VIDEO)
            .notes("Technical round with engineering team")
            .build());

        interviewRepository.save(Interview.builder()
            .jobApplication(app6)
            .interviewDate(LocalDateTime.of(2026, 7, 20, 14, 0))
            .interviewType(InterviewType.PHONE)
            .notes("Initial phone screen with recruiter")
            .build());

        interviewRepository.save(Interview.builder()
            .jobApplication(app2)
            .interviewDate(LocalDateTime.of(2026, 7, 22, 11, 0))
            .interviewType(InterviewType.VIDEO)
            .notes("Portfolio review")
            .build());

        interviewRepository.save(Interview.builder()
            .jobApplication(app4)
            .interviewDate(LocalDateTime.of(2026, 7, 25, 9, 0))
            .interviewType(InterviewType.ONSITE)
            .notes("Final round onsite interview")
            .build());
    }
}