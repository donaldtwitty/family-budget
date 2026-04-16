package com.familybudget.controller;

import com.familybudget.service.BudgetService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST API for the family budget application.
 *
 * Endpoints
 * ---------
 *  GET  /api/data   — fetch the stored AppData JSON (null → 204 No Content on first run)
 *  PUT  /api/data   — persist the full AppData JSON
 *  GET  /api/health — simple liveness probe for Railway
 */
@RestController
@RequestMapping("/api")
public class BudgetController {

    private final BudgetService service;

    public BudgetController(BudgetService service) {
        this.service = service;
    }

    /**
     * Load stored AppData.
     * Returns 204 when no data exists yet (first launch).
     * Returns 200 with the raw JSON payload otherwise.
     */
    @GetMapping(value = "/data", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getData() {
        String data = service.loadData();
        if (data == null) {
            return ResponseEntity.noContent().build();   // 204 — let frontend seed defaults
        }
        return ResponseEntity.ok(data);
    }

    /**
     * Persist the complete AppData JSON.
     * The frontend sends the same shape it already uses for localStorage.
     */
    @PutMapping(
        value = "/data",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<String> saveData(@RequestBody String body) {
        service.saveData(body);
        return ResponseEntity.ok("{\"status\":\"saved\"}");
    }

    /**
     * Health-check endpoint used by Railway's zero-downtime deploy checks.
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("{\"status\":\"ok\"}");
    }
}
