package com.familybudget.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.net.URI;

/**
 * Production DataSource configuration.
 *
 * Railway (and Heroku-compatible platforms) inject the database connection
 * string as DATABASE_URL in the format:
 *
 *   postgresql://user:password@host:port/database
 *
 * JDBC requires the format:
 *
 *   jdbc:postgresql://host:port/database?user=user&password=password
 *
 * Spring Boot's autoconfiguration cannot bridge this gap on its own, so we
 * parse the URI here and build the HikariCP DataSource manually.
 *
 * Active only under the "prod" Spring profile — local dev continues to use
 * H2 autoconfiguration from application.properties.
 */
@Configuration
@Profile("prod")
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Value("${DATABASE_URL}")
    private String databaseUrl;

    @Bean
    public DataSource dataSource() {
        URI uri = URI.create(databaseUrl);

        String host     = uri.getHost();
        int    port     = uri.getPort() == -1 ? 5432 : uri.getPort();
        // URI path is "/dbname" — strip the leading slash
        String database = uri.getPath().replaceFirst("^/", "");

        String[] userInfo = uri.getUserInfo() != null
            ? uri.getUserInfo().split(":", 2)
            : new String[]{"", ""};
        String username = userInfo[0];
        String password = userInfo.length > 1 ? userInfo[1] : "";

        String jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s", host, port, database);

        log.info("Connecting to PostgreSQL at {}:{}/{}", host, port, database);

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName("org.postgresql.Driver");

        // Connection pool tuning — conservative defaults for Railway's free tier
        config.setMaximumPoolSize(5);
        config.setConnectionTimeout(20_000);
        config.setIdleTimeout(300_000);
        config.setMaxLifetime(1_200_000);
        // Validate connections cheaply
        config.setConnectionTestQuery("SELECT 1");

        return new HikariDataSource(config);
    }
}
