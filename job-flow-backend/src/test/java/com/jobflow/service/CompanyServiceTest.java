package com.jobflow.service;

import com.jobflow.dto.CompanyDTO;
import com.jobflow.dto.CreateCompanyRequest;
import com.jobflow.model.Company;
import com.jobflow.repository.CompanyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CompanyServiceTest {

    @Mock
    private CompanyRepository companyRepository;

    @InjectMocks
    private CompanyService companyService;

    private Company testCompany;

    @BeforeEach
    void setUp() {
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

        when(companyRepository.findAll()).thenReturn(List.of(testCompany, second));

        List<CompanyDTO> result = companyService.findAll();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(1L);
        assertThat(result.get(0).getName()).isEqualTo("Acme Inc");
        assertThat(result.get(0).getLocation()).isEqualTo("San Francisco");
        assertThat(result.get(1).getName()).isEqualTo("Globex");
    }

    @Test
    void findById_notFound_throwsException() {
        when(companyRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> companyService.findById(999L))
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

        when(companyRepository.save(any(Company.class)))
                .thenAnswer(invocation -> {
                    Company saved = invocation.getArgument(0);
                    saved.setId(5L);
                    return saved;
                });

        CompanyDTO result = companyService.create(request);

        assertThat(result.getId()).isEqualTo(5L);
        assertThat(result.getName()).isEqualTo("NewCo");
        assertThat(result.getLocation()).isEqualTo("Boston");
        assertThat(result.getWebsite()).isEqualTo("https://newco.com");
        assertThat(result.getLogoUrl()).isEqualTo("https://newco.com/logo.png");

        verify(companyRepository).save(any(Company.class));
    }

    @Test
    void update_modifiesFields() {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));
        when(companyRepository.save(any(Company.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CreateCompanyRequest request = new CreateCompanyRequest();
        request.setName("Updated Name");
        request.setLocation("Austin");
        request.setWebsite("https://updated.com");
        request.setLogoUrl(null);

        CompanyDTO result = companyService.update(1L, request);

        assertThat(result.getName()).isEqualTo("Updated Name");
        assertThat(result.getLocation()).isEqualTo("Austin");
        assertThat(result.getWebsite()).isEqualTo("https://updated.com");
        assertThat(result.getLogoUrl()).isNull();
    }

    @Test
    void delete_callsRepository() {
        companyService.delete(1L);

        verify(companyRepository).deleteById(1L);
    }
}
