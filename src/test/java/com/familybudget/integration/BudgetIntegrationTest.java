package com.familybudget.integration;

import com.familybudget.repository.AppDataRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Full-stack integration tests using a real Spring context and H2 in-memory database.
 * Each test starts with a clean database (see @BeforeEach).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("default")
class BudgetIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private AppDataRepository repo;

    private static final String PAYLOAD =
        "{\"bills\":[],\"income\":[],\"goals\":[],\"debts\":[],\"spending\":[],\"paid\":{}}";

    @BeforeEach
    void clearDatabase() {
        repo.deleteAll();
    }

    // ── Health ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/health returns 200 with {\"status\":\"ok\"}")
    void health_returns200WithOkStatus() {
        ResponseEntity<String> res = rest.getForEntity("/api/health", String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).contains("\"status\":\"ok\"");
    }

    // ── GET /api/data ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/data returns 204 when the database is empty (first launch)")
    void getData_returns204OnEmptyDatabase() {
        ResponseEntity<String> res = rest.getForEntity("/api/data", String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    @DisplayName("GET /api/data returns Content-Type application/json after data is saved")
    void getData_returnsJsonContentType() {
        putPayload(PAYLOAD);

        ResponseEntity<String> res = rest.getForEntity("/api/data", String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getHeaders().getContentType().toString()).contains("application/json");
    }

    // ── PUT → GET round-trip ──────────────────────────────────────────────────

    @Test
    @DisplayName("PUT /api/data followed by GET /api/data returns the exact same payload")
    void putThenGet_roundTripsPayload() {
        ResponseEntity<String> put = putPayload(PAYLOAD);
        assertThat(put.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(put.getBody()).contains("\"status\":\"saved\"");

        ResponseEntity<String> get = rest.getForEntity("/api/data", String.class);
        assertThat(get.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(get.getBody()).isEqualTo(PAYLOAD);
    }

    @Test
    @DisplayName("Two consecutive PUTs result in exactly one database row (upsert behaviour)")
    void consecutivePuts_upsertKeepsSingleRow() {
        String updated = "{\"bills\":[{\"id\":\"b1\"}],\"income\":[],\"goals\":[],"
                       + "\"debts\":[],\"spending\":[],\"paid\":{}}";

        putPayload(PAYLOAD);
        putPayload(updated);

        assertThat(repo.count()).isEqualTo(1);
        assertThat(repo.findByHouseholdId("default").get().getData()).isEqualTo(updated);
    }

    // ── Error cases ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("PUT /api/data with an empty body returns a 4xx client error")
    void putEmptyBody_returns4xxError() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> res = rest.exchange(
            "/api/data", HttpMethod.PUT, new HttpEntity<>("", headers), String.class);

        assertThat(res.getStatusCode().is4xxClientError()).isTrue();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ResponseEntity<String> putPayload(String json) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return rest.exchange("/api/data", HttpMethod.PUT, new HttpEntity<>(json, headers), String.class);
    }
}
