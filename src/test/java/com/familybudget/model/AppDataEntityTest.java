package com.familybudget.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class AppDataEntityTest {

    @Test
    @DisplayName("default householdId is 'default'")
    void defaultHouseholdId() {
        assertThat(new AppDataEntity().getHouseholdId()).isEqualTo("default");
    }

    @Test
    @DisplayName("updatedAt is initialized to a non-null Instant on construction")
    void updatedAtNonNullOnConstruction() {
        assertThat(new AppDataEntity().getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("touch() sets updatedAt to a timestamp at or after the call time")
    void touch_setsUpdatedAtToNow() {
        AppDataEntity entity = new AppDataEntity();
        Instant callTime = Instant.now();
        entity.touch();
        assertThat(entity.getUpdatedAt()).isAfterOrEqualTo(callTime);
    }

    @Test
    @DisplayName("setData / getData round-trips an arbitrary JSON string")
    void dataFieldRoundTrips() {
        AppDataEntity entity = new AppDataEntity();
        String json = "{\"bills\":[{\"id\":\"b1\",\"amount\":100}],\"income\":[]}";
        entity.setData(json);
        assertThat(entity.getData()).isEqualTo(json);
    }

    @Test
    @DisplayName("setHouseholdId changes the value returned by getHouseholdId")
    void setHouseholdId_changesValue() {
        AppDataEntity entity = new AppDataEntity();
        entity.setHouseholdId("family-2025");
        assertThat(entity.getHouseholdId()).isEqualTo("family-2025");
    }

    @Test
    @DisplayName("id is null before persistence — assigned by the database on first save")
    void idIsNullBeforePersistence() {
        assertThat(new AppDataEntity().getId()).isNull();
    }
}
