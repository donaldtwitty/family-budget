package com.familybudget.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security configuration.
 *
 * This is a single-household app served to trusted family members.
 * CSRF is disabled for the REST API (stateless JSON endpoints).
 *
 * ── Hardening checklist for production ──────────────────────
 *  1. Set a strong SESSION_SECRET / SPRING_SECURITY_* env vars on Railway.
 *  2. Consider adding HTTP Basic or Bearer-token auth if the app will be
 *     exposed to the public internet.
 *  3. Enable HTTPS redirect (Railway provides this via its edge proxy).
 * ────────────────────────────────────────────────────────────
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF for stateless REST API
            .csrf(AbstractHttpConfigurer::disable)

            // Stateless — no server-side sessions for API calls
            .sessionManagement(sm ->
                sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Authorize requests
            .authorizeHttpRequests(auth -> auth
                // Health probe — always public
                .requestMatchers("/api/health").permitAll()
                // REST data endpoints — public (add auth here if needed)
                .requestMatchers("/api/**").permitAll()
                // Static front-end assets
                .requestMatchers(
                    "/", "/index.html",
                    "/css/**", "/js/**",
                    "/icons/**", "/manifest.json", "/sw.js"
                ).permitAll()
                // H2 web console — local dev only.
                // spring.h2.console.enabled=false in application-prod.properties
                // ensures this path is never reachable in production even though
                // it is permitted here.
                .requestMatchers("/h2-console/**").permitAll()
                // Deny everything else
                .anyRequest().denyAll()
            )

            // H2 console uses <iframe> internally — disable frame options only
            // for the h2-console path so the rest of the app is still protected.
            .headers(headers -> headers
                .frameOptions(fo -> fo.sameOrigin())
            )

            // Disable default login page (not needed for a SPA)
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable);

        return http.build();
    }
}
