package com.familybudget.repository;

import com.familybudget.model.AppDataEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class AppDataRepositoryTest {

    @Autowired
    private AppDataRepository repo;

    private static final String PAYLOAD = "{\"bills\":[],\"income\":[]}";

    private AppDataEntity saveDefault() {
        AppDataEntity e = new AppDataEntity();
        e.setHouseholdId("default");
        e.setData(PAYLOAD);
        return repo.save(e);
    }

    @Test
    @DisplayName("findByHouseholdId returns empty Optional on a fresh database")
    void findByHouseholdId_emptyOnFreshDb() {
        assertThat(repo.findByHouseholdId("default")).isEmpty();
    }

    @Test
    @DisplayName("findByHouseholdId returns the saved entity after a save")
    void findByHouseholdId_returnsEntityAfterSave() {
        saveDefault();
        Optional<AppDataEntity> result = repo.findByHouseholdId("default");
        assertThat(result).isPresent();
        assertThat(result.get().getData()).isEqualTo(PAYLOAD);
    }

    @Test
    @DisplayName("saving the same entity twice updates the row (no duplicate rows)")
    void save_updateKeepsSingleRow() {
        AppDataEntity entity = saveDefault();
        entity.setData("{\"version\":2}");
        repo.save(entity);

        assertThat(repo.count()).isEqualTo(1);
        assertThat(repo.findByHouseholdId("default").get().getData()).isEqualTo("{\"version\":2}");
    }

    @Test
    @DisplayName("updatedAt is non-null after save")
    void updatedAt_nonNullAfterSave() {
        assertThat(saveDefault().getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("findByHouseholdId does not return an entity saved under a different householdId")
    void findByHouseholdId_isolatesHouseholds() {
        AppDataEntity other = new AppDataEntity();
        other.setHouseholdId("household-x");
        other.setData(PAYLOAD);
        repo.save(other);

        assertThat(repo.findByHouseholdId("default")).isEmpty();
    }

    @Test
    @DisplayName("save assigns a non-null auto-generated id")
    void save_assignsDatabaseId() {
        assertThat(saveDefault().getId()).isNotNull();
    }

    @Test
    @DisplayName("saved entity's householdId matches what was set")
    void save_persistsHouseholdId() {
        AppDataEntity saved = saveDefault();
        assertThat(saved.getHouseholdId()).isEqualTo("default");
    }
}
