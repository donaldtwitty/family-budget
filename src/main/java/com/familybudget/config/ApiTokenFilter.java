package com.familybudget.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Protects /api/data endpoints with a Bearer token when BUDGET_API_TOKEN is set.
 * If the env var is empty or absent, all requests pass through (local dev mode).
 */
public class ApiTokenFilter extends OncePerRequestFilter {

    private final String expectedToken;

    public ApiTokenFilter(String expectedToken) {
        this.expectedToken = expectedToken;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        // Skip auth entirely when no token is configured (local dev)
        if (expectedToken == null || expectedToken.isBlank()) {
            chain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();

        // /api/health is always public (Railway zero-downtime deploy checks)
        if (!path.startsWith("/api/") || path.equals("/api/health")) {
            chain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");
        if (header != null && header.equals("Bearer " + expectedToken)) {
            chain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"Unauthorized — configure access code in Sync settings\"}");
    }
}
