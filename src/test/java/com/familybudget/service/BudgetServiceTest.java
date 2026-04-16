package com.familybudget.service;

import com.familybudget.model.AppDataEntity;
import com.familybudget.repository.AppDataRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for BudgetService — repository is mocked, no DB needed.
 */
@ExtendWith(MockitoExtension.class)
class BudgetServiceTest {

    @Mock
    private AppDataRepository repo;

    @InjectMocks
    private BudgetService service;

    private static final String HOUSEHOLD = "default";
    private static final String SAMPLE_JSON =
        "{\"bills\":[],\"income\":[],\"goals\":[],\"debts\":[],\"spending\":[],\"paid\":{}}";

    // ── loadData ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("loadData returns stored JSON when a row exists")
    void loadData_returnsStoredJson() {
        AppDataEntity entity = new AppDataEntity();
        entity.setData(SAMPLE_JSON);
        when(repo.findByHouseholdId(HOUSEHOLD)).thenReturn(Optional.of(entity));

        String result = service.loadData();

        assertThat(result).isEqualTo(SAMPLE_JSON);
    }

    @Test
    @DisplayName("loadData returns null when no row exists yet (first launch)")
    void loadData_returnsNullWhenAbsent() {
        when(repo.findByHouseholdId(HOUSEHOLD)).thenReturn(Optional.empty());

        assertThat(service.loadData()).isNull();
    }

    // ── saveData ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("saveData inserts a new row when none exists")
    void saveData_insertsNewEntity() {
        when(repo.findByHouseholdId(HOUSEHOLD)).thenReturn(Optional.empty());
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.saveData(SAMPLE_JSON);

        ArgumentCaptor<AppDataEntity> captor = ArgumentCaptor.forClass(AppDataEntity.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getData()).isEqualTo(SAMPLE_JSON);
        assertThat(captor.getValue().getHouseholdId()).isEqualTo(HOUSEHOLD);
    }

    @Test
    @DisplayName("saveData updates the existing row rather than inserting a duplicate")
    void saveData_updatesExistingEntity() {
        AppDataEntity existing = new AppDataEntity();
        existing.setHouseholdId(HOUSEHOLD);
        existing.setData("{\"old\":true}");

        when(repo.findByHouseholdId(HOUSEHOLD)).thenReturn(Optional.of(existing));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.saveData(SAMPLE_JSON);

        // Only one save call, and it carries the new payload
        ArgumentCaptor<AppDataEntity> captor = ArgumentCaptor.forClass(AppDataEntity.class);
        verify(repo, times(1)).save(captor.capture());
        assertThat(captor.getValue().getData()).isEqualTo(SAMPLE_JSON);
    }

    @Test
    @DisplayName("saveData throws IllegalArgumentException for null or blank input")
    void saveData_rejectsBlankPayload() {
        assertThatThrownBy(() -> service.saveData(null))
            .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> service.saveData("   "))
            .isInstanceOf(IllegalArgumentException.class);

        // Repository should never be touched when input is invalid
        verifyNoInteractions(repo);
    }
}
