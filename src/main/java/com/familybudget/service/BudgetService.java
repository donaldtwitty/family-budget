package com.familybudget.service;

import com.familybudget.model.AppDataEntity;
import com.familybudget.repository.AppDataRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles persistence of the household AppData JSON document.
 * A single "default" household row is upserted on each save.
 */
@Service
@Transactional
public class BudgetService {

    private static final Logger log = LoggerFactory.getLogger(BudgetService.class);
    private static final String DEFAULT_HOUSEHOLD = "default";

    private final AppDataRepository repo;

    public BudgetService(AppDataRepository repo) {
        this.repo = repo;
    }

    /**
     * Returns the stored JSON payload, or null if none exists yet
     * (first-launch — frontend will seed from defaults).
     */
    @Transactional(readOnly = true)
    public String loadData() {
        return repo.findByHouseholdId(DEFAULT_HOUSEHOLD)
                   .map(AppDataEntity::getData)
                   .orElse(null);
    }

    /**
     * Upserts the full AppData JSON for the default household.
     *
     * @param json raw JSON string from the request body
     * @throws IllegalArgumentException if the JSON is null or blank
     */
    public void saveData(String json) {
        if (json == null || json.isBlank()) {
            throw new IllegalArgumentException("AppData payload must not be empty");
        }

        AppDataEntity entity = repo.findByHouseholdId(DEFAULT_HOUSEHOLD)
                                   .orElseGet(() -> {
                                       AppDataEntity e = new AppDataEntity();
                                       e.setHouseholdId(DEFAULT_HOUSEHOLD);
                                       return e;
                                   });

        entity.setData(json);
        repo.save(entity);
        log.debug("AppData saved ({} bytes)", json.length());
    }
}
