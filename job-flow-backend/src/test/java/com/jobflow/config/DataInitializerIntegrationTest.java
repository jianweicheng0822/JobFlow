package com.jobflow.config;

import com.jobflow.controller.BaseIntegrationTest;
import com.jobflow.model.Company;
import com.jobflow.model.User;
import com.jobflow.repository.CompanyRepository;
import com.jobflow.repository.InterviewRepository;
import com.jobflow.repository.JobApplicationRepository;
import com.jobflow.repository.UserRepository;
import com.jobflow.security.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

// The test profile used to skip the seeder entirely, which is how a fresh install
// crashing on it (companies saved without an owner) went unnoticed
@TestPropertySource(properties = "app.seed-demo-data=true")
class DataInitializerIntegrationTest extends BaseIntegrationTest {

    @MockBean
    @SuppressWarnings("unused")
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Autowired private DataInitializer dataInitializer;
    @Autowired private UserRepository userRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private JobApplicationRepository jobApplicationRepository;
    @Autowired private InterviewRepository interviewRepository;

    @Test
    void seedsEmptyDatabase_withEverythingOwnedByDemoUser() {
        dataInitializer.run();

        User demo = userRepository.findByEmail(DataInitializer.DEMO_EMAIL).orElseThrow();
        assertThat(userRepository.count()).isEqualTo(1);
        assertThat(companyRepository.findByUserId(demo.getId()))
                .hasSize(5)
                .extracting(Company::getName)
                .contains("Google", "Spotify");
        assertThat(jobApplicationRepository.countByUserId(demo.getId())).isEqualTo(10);
        assertThat(interviewRepository.findByJobApplicationUserId(demo.getId())).hasSize(4);
    }

    @Test
    void secondRun_changesNothing() {
        dataInitializer.run();
        dataInitializer.run();

        assertThat(userRepository.count()).isEqualTo(1);
        assertThat(companyRepository.count()).isEqualTo(5);
        assertThat(jobApplicationRepository.count()).isEqualTo(10);
        assertThat(interviewRepository.count()).isEqualTo(4);
    }

    @Test
    void offUnlessEnabled() {
        ApplicationContextRunner runner = new ApplicationContextRunner()
                .withBean(CompanyRepository.class, () -> mock(CompanyRepository.class))
                .withBean(JobApplicationRepository.class, () -> mock(JobApplicationRepository.class))
                .withBean(InterviewRepository.class, () -> mock(InterviewRepository.class))
                .withBean(UserRepository.class, () -> mock(UserRepository.class))
                .withBean(PasswordEncoder.class, () -> mock(PasswordEncoder.class))
                .withUserConfiguration(DataInitializer.class);

        runner.run(context -> assertThat(context).doesNotHaveBean(DataInitializer.class));
        runner.withPropertyValues("app.seed-demo-data=false")
                .run(context -> assertThat(context).doesNotHaveBean(DataInitializer.class));
        runner.withPropertyValues("app.seed-demo-data=true")
                .run(context -> assertThat(context).hasSingleBean(DataInitializer.class));
    }
}
