package com.familybudget.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("handleBadRequest returns HTTP 400")
    void handleBadRequest_returns400() {
        ResponseEntity<Map<String, Object>> res =
            handler.handleBadRequest(new IllegalArgumentException("invalid input"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("handleBadRequest body contains status=400, error=Bad Request, and the exception message")
    void handleBadRequest_bodyHasCorrectFields() {
        ResponseEntity<Map<String, Object>> res =
            handler.handleBadRequest(new IllegalArgumentException("must not be empty"));

        Map<String, Object> body = res.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("status")).isEqualTo(400);
        assertThat(body.get("error")).isEqualTo("Bad Request");
        assertThat(body.get("message")).isEqualTo("must not be empty");
        assertThat(body.get("timestamp")).isNotNull();
    }

    @Test
    @DisplayName("handleGeneric returns HTTP 500")
    void handleGeneric_returns500() {
        ResponseEntity<Map<String, Object>> res =
            handler.handleGeneric(new RuntimeException("db error"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @Test
    @DisplayName("handleGeneric body uses a generic message and does not expose internal exception details")
    void handleGeneric_bodyHasGenericMessage() {
        ResponseEntity<Map<String, Object>> res =
            handler.handleGeneric(new RuntimeException("sensitive internal detail"));

        Map<String, Object> body = res.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("status")).isEqualTo(500);
        assertThat(body.get("error")).isEqualTo("Internal Server Error");
        assertThat(body.get("message")).isEqualTo("An unexpected error occurred");
        assertThat((String) body.get("message")).doesNotContain("sensitive internal detail");
    }

    @Test
    @DisplayName("timestamp in error response is a valid ISO-8601 UTC string")
    void errorBody_timestampIsIso8601() {
        ResponseEntity<Map<String, Object>> res =
            handler.handleBadRequest(new IllegalArgumentException("test"));

        String ts = (String) res.getBody().get("timestamp");
        assertThat(ts).matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.*Z");
    }
}
