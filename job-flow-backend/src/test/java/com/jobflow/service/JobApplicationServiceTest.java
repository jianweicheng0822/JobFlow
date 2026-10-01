package com.jobflow.service;

import com.jobflow.dto.*;
import com.jobflow.exception.NotFoundException;
import com.jobflow.model.ApplicationStatus;
import com.jobflow.model.Company;
import com.jobflow.model.JobApplication;
import com.jobflow.model.User;
import com.jobflow.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JobApplicationServiceTest {

    @Mock
    private JobApplicationRepository jobApplicationRepository;
    @Mock
    private CompanyRepository companyRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CompanyService companyService;
    @Mock
    private EmailImportLogRepository emailImportLogRepository;
    @Mock
    private InterviewRepository interviewRepository;

    @InjectMocks
    private JobApplicationService jobApplicationService;

    private User testUser;
    private Company testCompany;
    private JobApplication testApp;
    private CompanyDTO testCompanyDTO;

    @BeforeEach
    void setUp() {
        testUser = User.builder().id(1L).email("test@example.com").build();

        testCompany = Company.builder().id(10L).name("TestCorp").build();

        testCompanyDTO = CompanyDTO.builder().id(10L).name("TestCorp").build();

        testApp = JobApplication.builder()
                .id(100L)
                .user(testUser)
                .positionTitle("Software Engineer")
                .company(testCompany)
                .location("Remote")
                .salary("100k")
                .status(ApplicationStatus.APPLIED)
                .appliedDate(LocalDate.of(2026, 9, 1))
                .lastAction("Applied online")
                .notes("Great opportunity")
                .starred(false)
                .createdAt(LocalDateTime.of(2026, 9, 1, 10, 0))
                .updatedAt(LocalDateTime.of(2026, 9, 1, 10, 0))
                .build();
    }

    // --- findAll ---

    @Test
    void findAll_returnsDTOs() {
        when(jobApplicationRepository.findByUserIdOrderByUpdatedAtDesc(1L))
                .thenReturn(List.of(testApp));
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        List<JobApplicationDTO> result = jobApplicationService.findAll(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(100L);
        assertThat(result.get(0).getPositionTitle()).isEqualTo("Software Engineer");
        assertThat(result.get(0).getCompany().getName()).isEqualTo("TestCorp");
        assertThat(result.get(0).getLocation()).isEqualTo("Remote");
        assertThat(result.get(0).isStarred()).isFalse();
    }

    @Test
    void findAll_emptyList() {
        when(jobApplicationRepository.findByUserIdOrderByUpdatedAtDesc(1L))
                .thenReturn(List.of());

        List<JobApplicationDTO> result = jobApplicationService.findAll(1L);

        assertThat(result).isEmpty();
    }

    // --- findAllPaged ---

    @Test
    void findAllPaged_noFilters_returnsPagedResult() {
        Page<JobApplication> page = new PageImpl<>(List.of(testApp), PageRequest.of(0, 10), 1);
        when(jobApplicationRepository.findByUserId(eq(1L), any(Pageable.class))).thenReturn(page);
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        PageResponse<JobApplicationDTO> result = jobApplicationService.findAllPaged(
                1L, 0, 10, null, null, "updatedAt", "desc");

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getPage()).isEqualTo(0);
    }

    @Test
    void findAllPaged_withStatusFilter() {
        Page<JobApplication> page = new PageImpl<>(List.of(testApp), PageRequest.of(0, 10), 1);
        when(jobApplicationRepository.findByUserIdAndStatus(eq(1L), eq(ApplicationStatus.APPLIED), any(Pageable.class)))
                .thenReturn(page);
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        PageResponse<JobApplicationDTO> result = jobApplicationService.findAllPaged(
                1L, 0, 10, ApplicationStatus.APPLIED, null, "updatedAt", "desc");

        assertThat(result.getContent()).hasSize(1);
        verify(jobApplicationRepository).findByUserIdAndStatus(eq(1L), eq(ApplicationStatus.APPLIED), any(Pageable.class));
    }

    @Test
    void findAllPaged_withKeyword() {
        Page<JobApplication> page = new PageImpl<>(List.of(testApp), PageRequest.of(0, 10), 1);
        when(jobApplicationRepository.searchByKeyword(eq(1L), eq("engineer"), any(Pageable.class)))
                .thenReturn(page);
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        PageResponse<JobApplicationDTO> result = jobApplicationService.findAllPaged(
                1L, 0, 10, null, "engineer", "updatedAt", "desc");

        assertThat(result.getContent()).hasSize(1);
        verify(jobApplicationRepository).searchByKeyword(eq(1L), eq("engineer"), any(Pageable.class));
    }

    @Test
    void findAllPaged_withKeywordAndStatus() {
        Page<JobApplication> page = new PageImpl<>(List.of(testApp), PageRequest.of(0, 10), 1);
        when(jobApplicationRepository.searchByKeywordAndStatus(eq(1L), eq("engineer"), eq(ApplicationStatus.APPLIED), any(Pageable.class)))
                .thenReturn(page);
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        PageResponse<JobApplicationDTO> result = jobApplicationService.findAllPaged(
                1L, 0, 10, ApplicationStatus.APPLIED, "engineer", "updatedAt", "desc");

        assertThat(result.getContent()).hasSize(1);
        verify(jobApplicationRepository).searchByKeywordAndStatus(eq(1L), eq("engineer"), eq(ApplicationStatus.APPLIED), any(Pageable.class));
    }

    @Test
    void findAllPaged_sortByAppliedDateAsc() {
        Page<JobApplication> page = new PageImpl<>(List.of(testApp), PageRequest.of(0, 10), 1);
        when(jobApplicationRepository.findByUserId(eq(1L), any(Pageable.class))).thenReturn(page);
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        PageResponse<JobApplicationDTO> result = jobApplicationService.findAllPaged(
                1L, 0, 10, null, null, "appliedDate", "asc");

        assertThat(result.getContent()).hasSize(1);
    }

    // --- findByStatus ---

    @Test
    void findByStatus_returnsDTOs() {
        when(jobApplicationRepository.findByUserIdAndStatusOrderByUpdatedAtDesc(1L, ApplicationStatus.INTERVIEW))
                .thenReturn(List.of(testApp));
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        List<JobApplicationDTO> result = jobApplicationService.findByStatus(1L, ApplicationStatus.INTERVIEW);

        assertThat(result).hasSize(1);
    }

    // --- findById ---

    @Test
    void findById_found_returnsDTO() {
        when(jobApplicationRepository.findByIdAndUserId(100L, 1L))
                .thenReturn(Optional.of(testApp));
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        JobApplicationDTO result = jobApplicationService.findById(1L, 100L);

        assertThat(result.getId()).isEqualTo(100L);
        assertThat(result.getPositionTitle()).isEqualTo("Software Engineer");
    }

    @Test
    void findById_notFound_throwsException() {
        when(jobApplicationRepository.findByIdAndUserId(999L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobApplicationService.findById(1L, 999L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Job application not found");
    }

    // --- create ---

    @Test
    void create_withCompanyId_savesAndReturnsDTO() {
        CreateJobApplicationRequest request = new CreateJobApplicationRequest();
        request.setPositionTitle("Backend Dev");
        request.setCompanyId(10L);
        request.setLocation("NYC");
        request.setSalary("120k");
        request.setStatus(ApplicationStatus.APPLIED);
        request.setAppliedDate(LocalDate.of(2026, 9, 15));

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(companyRepository.findById(10L)).thenReturn(Optional.of(testCompany));
        when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> {
            JobApplication saved = inv.getArgument(0);
            saved.setId(101L);
            return saved;
        });
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        JobApplicationDTO result = jobApplicationService.create(1L, request);

        assertThat(result.getId()).isEqualTo(101L);
        assertThat(result.getPositionTitle()).isEqualTo("Backend Dev");
        verify(jobApplicationRepository).save(any(JobApplication.class));
    }

    @Test
    void create_withCompanyName_findsOrCreatesCompany() {
        CreateJobApplicationRequest request = new CreateJobApplicationRequest();
        request.setPositionTitle("Frontend Dev");
        request.setCompanyName("NewCorp");

        Company newCompany = Company.builder().id(20L).name("NewCorp").build();
        CompanyDTO newCompanyDTO = CompanyDTO.builder().id(20L).name("NewCorp").build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(companyRepository.findByNameIgnoreCase("NewCorp")).thenReturn(Optional.empty());
        when(companyRepository.save(any(Company.class))).thenReturn(newCompany);
        when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> {
            JobApplication saved = inv.getArgument(0);
            saved.setId(102L);
            return saved;
        });
        when(companyService.toDTO(newCompany)).thenReturn(newCompanyDTO);

        JobApplicationDTO result = jobApplicationService.create(1L, request);

        assertThat(result.getId()).isEqualTo(102L);
        verify(companyRepository).save(any(Company.class));
    }

    @Test
    void create_withExistingCompanyName_reusesCompany() {
        CreateJobApplicationRequest request = new CreateJobApplicationRequest();
        request.setPositionTitle("DevOps");
        request.setCompanyName("TestCorp");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(companyRepository.findByNameIgnoreCase("TestCorp")).thenReturn(Optional.of(testCompany));
        when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> {
            JobApplication saved = inv.getArgument(0);
            saved.setId(103L);
            return saved;
        });
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        JobApplicationDTO result = jobApplicationService.create(1L, request);

        assertThat(result.getId()).isEqualTo(103L);
        verify(companyRepository, never()).save(any(Company.class));
    }

    @Test
    void create_noCompanyIdOrName_throwsException() {
        CreateJobApplicationRequest request = new CreateJobApplicationRequest();
        request.setPositionTitle("Engineer");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        assertThatThrownBy(() -> jobApplicationService.create(1L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("companyId or companyName is required");
    }

    @Test
    void create_companyNotFound_throwsException() {
        CreateJobApplicationRequest request = new CreateJobApplicationRequest();
        request.setPositionTitle("Engineer");
        request.setCompanyId(999L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(companyRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobApplicationService.create(1L, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Company not found");
    }

    @Test
    void create_userNotFound_throwsException() {
        CreateJobApplicationRequest request = new CreateJobApplicationRequest();
        request.setPositionTitle("Engineer");
        request.setCompanyId(10L);

        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobApplicationService.create(99L, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("User not found");
    }

    @Test
    void create_defaultsStatusAndDate() {
        CreateJobApplicationRequest request = new CreateJobApplicationRequest();
        request.setPositionTitle("Engineer");
        request.setCompanyId(10L);
        // status and appliedDate are null -> should default

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(companyRepository.findById(10L)).thenReturn(Optional.of(testCompany));
        when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> {
            JobApplication saved = inv.getArgument(0);
            saved.setId(104L);
            return saved;
        });
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        JobApplicationDTO result = jobApplicationService.create(1L, request);

        assertThat(result.getStatus()).isEqualTo(ApplicationStatus.APPLIED);
        assertThat(result.getAppliedDate()).isEqualTo(LocalDate.now());
    }

    // --- update ---

    @Test
    void update_updatesFieldsAndReturnsDTO() {
        UpdateJobApplicationRequest request = new UpdateJobApplicationRequest();
        request.setPositionTitle("Senior Engineer");
        request.setLocation("SF");
        request.setSalary("150k");
        request.setStatus(ApplicationStatus.INTERVIEW);

        when(jobApplicationRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(testApp));
        when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> inv.getArgument(0));
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        JobApplicationDTO result = jobApplicationService.update(1L, 100L, request);

        assertThat(result.getPositionTitle()).isEqualTo("Senior Engineer");
        assertThat(result.getLocation()).isEqualTo("SF");
        assertThat(result.getStatus()).isEqualTo(ApplicationStatus.INTERVIEW);
    }

    @Test
    void update_withCompanyId_updatesCompany() {
        Company newCompany = Company.builder().id(20L).name("OtherCorp").build();
        CompanyDTO newCompanyDTO = CompanyDTO.builder().id(20L).name("OtherCorp").build();

        UpdateJobApplicationRequest request = new UpdateJobApplicationRequest();
        request.setCompanyId(20L);

        when(jobApplicationRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(testApp));
        when(companyRepository.findById(20L)).thenReturn(Optional.of(newCompany));
        when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> inv.getArgument(0));
        when(companyService.toDTO(newCompany)).thenReturn(newCompanyDTO);

        JobApplicationDTO result = jobApplicationService.update(1L, 100L, request);

        assertThat(result.getCompany().getName()).isEqualTo("OtherCorp");
    }

    @Test
    void update_notFound_throwsException() {
        UpdateJobApplicationRequest request = new UpdateJobApplicationRequest();

        when(jobApplicationRepository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobApplicationService.update(1L, 999L, request))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Job application not found");
    }

    // --- updateStatus ---

    @Test
    void updateStatus_updatesAndReturnsDTO() {
        when(jobApplicationRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(testApp));
        when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> inv.getArgument(0));
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        JobApplicationDTO result = jobApplicationService.updateStatus(1L, 100L, ApplicationStatus.OFFER);

        assertThat(result.getStatus()).isEqualTo(ApplicationStatus.OFFER);
    }

    @Test
    void updateStatus_notFound_throwsException() {
        when(jobApplicationRepository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobApplicationService.updateStatus(1L, 999L, ApplicationStatus.OFFER))
                .isInstanceOf(NotFoundException.class);
    }

    // --- delete ---

    @Test
    void delete_deletesAppAndRelatedData() {
        when(jobApplicationRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(testApp));

        jobApplicationService.delete(1L, 100L);

        verify(interviewRepository).deleteByJobApplicationId(100L);
        verify(emailImportLogRepository).deleteByJobApplicationId(100L);
        verify(jobApplicationRepository).delete(testApp);
    }

    @Test
    void delete_notFound_throwsException() {
        when(jobApplicationRepository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobApplicationService.delete(1L, 999L))
                .isInstanceOf(NotFoundException.class);
    }

    // --- deleteBatch ---

    @Test
    void deleteBatch_deletesMultiple() {
        JobApplication app2 = JobApplication.builder()
                .id(101L).user(testUser).company(testCompany)
                .positionTitle("PM").status(ApplicationStatus.APPLIED).build();

        when(jobApplicationRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(testApp));
        when(jobApplicationRepository.findByIdAndUserId(101L, 1L)).thenReturn(Optional.of(app2));

        jobApplicationService.deleteBatch(1L, List.of(100L, 101L));

        verify(jobApplicationRepository).delete(testApp);
        verify(jobApplicationRepository).delete(app2);
    }

    // --- findRecent ---

    @Test
    void findRecent_returnsTop10() {
        when(jobApplicationRepository.findTop10ByUserIdOrderByUpdatedAtDesc(1L))
                .thenReturn(List.of(testApp));
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        List<JobApplicationDTO> result = jobApplicationService.findRecent(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(100L);
    }

    // --- getStats ---

    @Test
    void getStats_calculatesRatesCorrectly() {
        when(jobApplicationRepository.countByUserId(1L)).thenReturn(100L);
        when(jobApplicationRepository.countByUserIdAndStatus(1L, ApplicationStatus.INTERVIEW)).thenReturn(20L);
        when(jobApplicationRepository.countByUserIdAndStatus(1L, ApplicationStatus.OFFER)).thenReturn(5L);
        when(jobApplicationRepository.countByUserIdAndStatus(1L, ApplicationStatus.IN_REVIEW)).thenReturn(30L);
        when(jobApplicationRepository.countByUserIdAndStatus(1L, ApplicationStatus.REJECTED)).thenReturn(10L);

        DashboardStatsDTO stats = jobApplicationService.getStats(1L);

        assertThat(stats.getTotalApplications()).isEqualTo(100);
        assertThat(stats.getInterviews()).isEqualTo(20);
        assertThat(stats.getOffers()).isEqualTo(5);
        assertThat(stats.getInReview()).isEqualTo(30);
        assertThat(stats.getRejections()).isEqualTo(10);
        assertThat(stats.getInterviewRate()).isEqualTo(20.0);
        assertThat(stats.getOfferRate()).isEqualTo(5.0);
    }

    @Test
    void getStats_zeroTotal_ratesAreZero() {
        when(jobApplicationRepository.countByUserId(1L)).thenReturn(0L);
        when(jobApplicationRepository.countByUserIdAndStatus(1L, ApplicationStatus.INTERVIEW)).thenReturn(0L);
        when(jobApplicationRepository.countByUserIdAndStatus(1L, ApplicationStatus.OFFER)).thenReturn(0L);
        when(jobApplicationRepository.countByUserIdAndStatus(1L, ApplicationStatus.IN_REVIEW)).thenReturn(0L);
        when(jobApplicationRepository.countByUserIdAndStatus(1L, ApplicationStatus.REJECTED)).thenReturn(0L);

        DashboardStatsDTO stats = jobApplicationService.getStats(1L);

        assertThat(stats.getTotalApplications()).isEqualTo(0);
        assertThat(stats.getInterviewRate()).isEqualTo(0);
        assertThat(stats.getOfferRate()).isEqualTo(0);
    }

    // --- getActivity ---

    @Test
    void getActivity_returns12Months() {
        when(jobApplicationRepository.countByUserIdAndAppliedDateBetween(eq(1L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(3L);

        List<ApplicationActivityDTO> activity = jobApplicationService.getActivity(1L);

        assertThat(activity).hasSize(12);
        assertThat(activity.get(0).getCount()).isEqualTo(3);
    }

    // --- toggleStar ---

    @Test
    void toggleStar_flipsStarred() {
        testApp.setStarred(false);
        when(jobApplicationRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(testApp));
        when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> inv.getArgument(0));
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        JobApplicationDTO result = jobApplicationService.toggleStar(1L, 100L);

        assertThat(result.isStarred()).isTrue();
    }

    @Test
    void toggleStar_unstar() {
        testApp.setStarred(true);
        when(jobApplicationRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(testApp));
        when(jobApplicationRepository.save(any(JobApplication.class))).thenAnswer(inv -> inv.getArgument(0));
        when(companyService.toDTO(testCompany)).thenReturn(testCompanyDTO);

        JobApplicationDTO result = jobApplicationService.toggleStar(1L, 100L);

        assertThat(result.isStarred()).isFalse();
    }

    @Test
    void toggleStar_notFound_throwsException() {
        when(jobApplicationRepository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobApplicationService.toggleStar(1L, 999L))
                .isInstanceOf(NotFoundException.class);
    }

    // --- exportCsv ---

    @Test
    void exportCsv_generatesValidCsv() {
        when(jobApplicationRepository.findByUserIdOrderByUpdatedAtDesc(1L))
                .thenReturn(List.of(testApp));

        String csv = jobApplicationService.exportCsv(1L);

        assertThat(csv).startsWith("Position,Company,Status,Location,Salary,Applied Date,Last Action,Notes\n");
        assertThat(csv).contains("Software Engineer");
        assertThat(csv).contains("TestCorp");
        assertThat(csv).contains("APPLIED");
        assertThat(csv).contains("Remote");
    }

    @Test
    void exportCsv_escapesCommasAndQuotes() {
        testApp.setPositionTitle("Engineer, Senior");
        testApp.setNotes("He said \"hello\"");
        when(jobApplicationRepository.findByUserIdOrderByUpdatedAtDesc(1L))
                .thenReturn(List.of(testApp));

        String csv = jobApplicationService.exportCsv(1L);

        // Commas in values should be quoted
        assertThat(csv).contains("\"Engineer, Senior\"");
        // Quotes in values should be doubled
        assertThat(csv).contains("\"He said \"\"hello\"\"\"");
    }

    @Test
    void exportCsv_handlesNullCompany() {
        testApp.setCompany(null);
        when(jobApplicationRepository.findByUserIdOrderByUpdatedAtDesc(1L))
                .thenReturn(List.of(testApp));

        String csv = jobApplicationService.exportCsv(1L);

        // Should not throw, company column should be empty
        assertThat(csv).contains("Software Engineer,,APPLIED");
    }

    @Test
    void exportCsv_emptyList() {
        when(jobApplicationRepository.findByUserIdOrderByUpdatedAtDesc(1L))
                .thenReturn(List.of());

        String csv = jobApplicationService.exportCsv(1L);

        // Should only have header
        assertThat(csv).isEqualTo("Position,Company,Status,Location,Salary,Applied Date,Last Action,Notes\n");
    }
}
