package com.familybudget;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Smoke test — verifies the Spring application context loads without errors.
 * Uses the default (H2) profile so no external database is needed in CI.
 */
@SpringBootTest
@ActiveProfiles("default")
class FamilyBudgetApplicationTests {

    @Test
    void contextLoads() {
        // If the context fails to start, this test fails with a descriptive error.
        // No assertions needed — the test passing IS the assertion.
    }
}
