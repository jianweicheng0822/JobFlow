package com.jobflow.service;

import com.jobflow.dto.CompanyDTO;
import com.jobflow.dto.CreateCompanyRequest;
import com.jobflow.model.Company;
import com.jobflow.model.User;
import com.jobflow.repository.CompanyRepository;
import com.jobflow.repository.EmailImportLogRepository;
import com.jobflow.repository.InterviewRepository;
import com.jobflow.repository.JobApplicationRepository;
import com.jobflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CompanyServiceTest {

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private JobApplicationRepository jobApplicationRepository;

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private EmailImportLogRepository emailImportLogRepository;

    @Mock
    private UserRepository userRepository;

    // A mock is enough: TransactionTemplate just runs the callback around it
    @Mock
    private PlatformTransactionManager transactionManager;

    @InjectMocks
    private CompanyService companyService;

    private User testUser;
    private Company testCompany;

    @BeforeEach
    void setUp() {
        testUser = User.builder().id(1L).email("test@example.com").build();

        testCompany = Company.builder()
                .id(1L)
                .name("Acme Inc")
                .location("San Francisco")
                .website("https://acme.com")
                .logoUrl("https://acme.com/logo.png")
                .build();
    }

    @Test
    void findAll_returnsDTOs() {
        Company second = Company.builder()
                .id(2L)
                .name("Globex")
                .location("NYC")
                .website("https://globex.com")
                .build();

        when(companyRepository.findByUserId(1L)).thenReturn(List.of(testCompany, second));

        List<CompanyDTO> result = companyService.findAll(1L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(1L);
        assertThat(result.get(0).getName()).isEqualTo("Acme Inc");
        assertThat(result.get(0).getLocation()).isEqualTo("San Francisco");
        assertThat(result.get(1).getName()).isEqualTo("Globex");
    }

    @Test
    void findById_notFound_throwsException() {
        when(companyRepository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> companyService.findById(1L, 999L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Company not found");
    }

    @Test
    void create_savesAndReturnsDTO() {
        CreateCompanyRequest request = new CreateCompanyRequest();
        request.setName("NewCo");
        request.setLocation("Boston");
        request.setWebsite("https://newco.com");
        request.setLogoUrl("https://newco.com/logo.png");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(companyRepository.saveAndFlush(any(Company.class)))
                .thenAnswer(invocation -> {
                    Company saved = invocation.getArgument(0);
                    saved.setId(5L);
                    return saved;
                });

        CompanyDTO result = companyService.create(1L, request);

        assertThat(result.getId()).isEqualTo(5L);
        assertThat(result.getName()).isEqualTo("NewCo");
        assertThat(result.getLocation()).isEqualTo("Boston");
        assertThat(result.getWebsite()).isEqualTo("https://newco.com");
        assertThat(result.getLogoUrl()).isEqualTo("https://newco.com/logo.png");

        verify(companyRepository).saveAndFlush(any(Company.class));
    }

    @Test
    void update_modifiesFields() {
        when(companyRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testCompany));
        when(companyRepository.saveAndFlush(any(Company.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CreateCompanyRequest request = new CreateCompanyRequest();
        request.setName("Updated Name");
        request.setLocation("Austin");
        request.setWebsite("https://updated.com");
        request.setLogoUrl(null);

        CompanyDTO result = companyService.update(1L, 1L, request);

        assertThat(result.getName()).isEqualTo("Updated Name");
        assertThat(result.getLocation()).isEqualTo("Austin");
        assertThat(result.getWebsite()).isEqualTo("https://updated.com");
        assertThat(result.getLogoUrl()).isNull();
    }

    @Test
    void delete_callsRepository() {
        when(companyRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testCompany));
        when(jobApplicationRepository.findIdsByCompanyId(1L))
                .thenReturn(Collections.emptyList());

        companyService.delete(1L, 1L);

        verify(companyRepository).deleteById(1L);
    }

    // --- input validation ---

    @Test
    void create_blankName_throwsException() {
        CreateCompanyRequest request = new CreateCompanyRequest();
        request.setName("   ");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        assertThatThrownBy(() -> companyService.create(1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Company name is required");
    }

    @Test
    void update_blankName_throwsException() {
        CreateCompanyRequest request = new CreateCompanyRequest();
        request.setName("");

        when(companyRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testCompany));

        assertThatThrownBy(() -> companyService.update(1L, 1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Company name is required");
    }

    @Test
    void create_trimsNameAndStoresBlankOptionalsAsNull() {
        CreateCompanyRequest request = new CreateCompanyRequest();
        request.setName("  NewCo  ");
        request.setLocation("  ");
        request.setWebsite("");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(companyRepository.saveAndFlush(any(Company.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CompanyDTO result = companyService.create(1L, request);

        assertThat(result.getName()).isEqualTo("NewCo");
        assertThat(result.getLocation()).isNull();
        assertThat(result.getWebsite()).isNull();
    }

    // --- findOrCreateByName ---

    @Test
    void findOrCreateByName_existing_returnsItWithoutInserting() {
        when(companyRepository.findByNameIgnoreCaseAndUserId("Acme Inc", 1L)).thenReturn(Optional.of(testCompany));

        Company result = companyService.findOrCreateByName(testUser, "Acme Inc");

        assertThat(result).isSameAs(testCompany);
        verify(companyRepository, never()).saveAndFlush(any(Company.class));
    }

    @Test
    void findOrCreateByName_missing_createsItForThisUser() {
        when(companyRepository.findByNameIgnoreCaseAndUserId("Initech", 1L)).thenReturn(Optional.empty());
        when(companyRepository.saveAndFlush(any(Company.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Company result = companyService.findOrCreateByName(testUser, "Initech");

        assertThat(result.getName()).isEqualTo("Initech");
        assertThat(result.getUser()).isSameAs(testUser);
    }

    @Test
    void findOrCreateByName_lostTheRace_returnsTheWinnersCompany() {
        Company winner = Company.builder().id(77L).name("Initech").user(testUser).build();
        // Not there on the first look, our insert hits the unique constraint, then the re-check finds it
        when(companyRepository.findByNameIgnoreCaseAndUserId("Initech", 1L))
                .thenReturn(Optional.empty(), Optional.of(winner));
        when(companyRepository.saveAndFlush(any(Company.class)))
                .thenThrow(new DataIntegrityViolationException("Duplicate entry"));

        Company result = companyService.findOrCreateByName(testUser, "Initech");

        assertThat(result).isSameAs(winner);
        // Both looks ran in their own new transaction
        verify(transactionManager, times(2)).getTransaction(any());
    }

    @Test
    void findOrCreateByName_constraintErrorButStillMissing_rethrows() {
        DataIntegrityViolationException original = new DataIntegrityViolationException("something else");
        when(companyRepository.findByNameIgnoreCaseAndUserId("Initech", 1L)).thenReturn(Optional.empty());
        when(companyRepository.saveAndFlush(any(Company.class))).thenThrow(original);

        assertThatThrownBy(() -> companyService.findOrCreateByName(testUser, "Initech")).isSameAs(original);
    }

    // --- duplicate names on the Companies page ---

    @Test
    void create_duplicateName_throwsFriendlyError() {
        CreateCompanyRequest request = new CreateCompanyRequest();
        request.setName("acme inc");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(companyRepository.findByNameIgnoreCaseAndUserId("acme inc", 1L)).thenReturn(Optional.of(testCompany));

        assertThatThrownBy(() -> companyService.create(1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("A company named 'acme inc' already exists");
        verify(companyRepository, never()).saveAndFlush(any(Company.class));
    }

    @Test
    void create_duplicateSavedInBetween_throwsFriendlyError() {
        CreateCompanyRequest request = new CreateCompanyRequest();
        request.setName("Racy Co");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(companyRepository.findByNameIgnoreCaseAndUserId("Racy Co", 1L)).thenReturn(Optional.empty());
        when(companyRepository.saveAndFlush(any(Company.class))).thenThrow(new DataIntegrityViolationException("Duplicate entry"));

        assertThatThrownBy(() -> companyService.create(1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("A company named 'Racy Co' already exists");
    }

    @Test
    void update_renameToOwnNameDifferentCase_isAllowed() {
        CreateCompanyRequest request = new CreateCompanyRequest();
        request.setName("ACME INC");

        when(companyRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testCompany));
        when(companyRepository.findByNameIgnoreCaseAndUserId("ACME INC", 1L)).thenReturn(Optional.of(testCompany));
        when(companyRepository.saveAndFlush(any(Company.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CompanyDTO result = companyService.update(1L, 1L, request);

        assertThat(result.getName()).isEqualTo("ACME INC");
    }

    @Test
    void update_renameToAnotherCompanysName_throwsFriendlyError() {
        Company other = Company.builder().id(2L).name("Globex").build();
        CreateCompanyRequest request = new CreateCompanyRequest();
        request.setName("Globex");

        when(companyRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testCompany));
        when(companyRepository.findByNameIgnoreCaseAndUserId("Globex", 1L)).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> companyService.update(1L, 1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("A company named 'Globex' already exists");
    }
}
