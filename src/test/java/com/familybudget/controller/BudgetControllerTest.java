package com.familybudget.controller;

import com.familybudget.service.BudgetService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Slice tests for BudgetController.
 * Uses @WebMvcTest so only the web layer is loaded — BudgetService is mocked.
 */
@WebMvcTest(BudgetController.class)
class BudgetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BudgetService budgetService;

    // ── GET /api/health ───────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/health returns 200 with ok status")
    void health_returns200() throws Exception {
        mockMvc.perform(get("/api/health"))
               .andExpect(status().isOk())
               .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$.status").value("ok"));
    }

    // ── GET /api/data ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/data returns 200 with JSON when data exists")
    void getData_returnsStoredJson() throws Exception {
        String payload = "{\"bills\":[],\"income\":[],\"goals\":[],\"debts\":[],\"spending\":[],\"paid\":{}}";
        when(budgetService.loadData()).thenReturn(payload);

        mockMvc.perform(get("/api/data").accept(MediaType.APPLICATION_JSON))
               .andExpect(status().isOk())
               .andExpect(content().json(payload));
    }

    @Test
    @DisplayName("GET /api/data returns 204 when no data exists yet (first launch)")
    void getData_returns204WhenEmpty() throws Exception {
        when(budgetService.loadData()).thenReturn(null);

        mockMvc.perform(get("/api/data").accept(MediaType.APPLICATION_JSON))
               .andExpect(status().isNoContent());
    }

    // ── PUT /api/data ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("PUT /api/data returns 200 and delegates to service")
    void saveData_returns200() throws Exception {
        String payload = "{\"bills\":[],\"income\":[],\"goals\":[],\"debts\":[],\"spending\":[],\"paid\":{}}";
        doNothing().when(budgetService).saveData(payload);

        mockMvc.perform(put("/api/data")
                   .contentType(MediaType.APPLICATION_JSON)
                   .content(payload))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.status").value("saved"));

        verify(budgetService, times(1)).saveData(payload);
    }

    @Test
    @DisplayName("PUT /api/data with blank body returns 400")
    void saveData_blankBody_returns400() throws Exception {
        doThrow(new IllegalArgumentException("AppData payload must not be empty"))
            .when(budgetService).saveData(anyString());

        mockMvc.perform(put("/api/data")
                   .contentType(MediaType.APPLICATION_JSON)
                   .content("{}"))
               .andExpect(status().isBadRequest());
    }
}
