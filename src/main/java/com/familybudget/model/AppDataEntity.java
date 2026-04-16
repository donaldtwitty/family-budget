package com.familybudget.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

/**
 * Persists the entire household budget as a single JSON document.
 * This mirrors the AppData shape the frontend already uses, so no
 * frontend data-structure change is needed.
 *
 * Schema: app_data(id, household_id, data JSONB, updated_at)
 */
@Entity
@Table(name = "app_data")
@Getter
@Setter
@NoArgsConstructor
public class AppDataEntity {

    /** Always 1 for a single-household deployment. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Logical household identifier — defaults to "default".
     * Extend this to a real user/auth system when needed.
     */
    @Column(name = "household_id", nullable = false, unique = true, length = 64)
    private String householdId = "default";

    /**
     * The full AppData payload.
     *
     * @JdbcTypeCode(SqlTypes.JSON) tells Hibernate this is a JSON value.
     * The actual DDL column type is left to the dialect:
     *   - PostgreSQL → "jsonb"  (binary JSON with indexing support)
     *   - H2         → "json"   (H2's built-in JSON type, compatible with TEXT)
     *
     * We deliberately omit columnDefinition = "jsonb" here because that is a
     * PostgreSQL-only DDL hint that causes H2 to throw an error during local
     * development (ddl-auto=update tries to execute "... data jsonb ..." which
     * H2 does not understand).
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data", nullable = false)
    private String data;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    @PrePersist
    public void touch() {
        updatedAt = Instant.now();
    }
}
