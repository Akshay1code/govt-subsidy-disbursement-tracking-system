package com.example.gov_scheme_backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class SchemeSchemaRepairRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public SchemeSchemaRepairRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        List<String> tables = List.of(
                "scheme_eligibility_rules",
                "scheme_required_documents",
                "scheme_required_fields",
                "applications"
        );

        for (String table : tables) {
            repairLegacySchemeIdColumn(table);
        }

        repairOptionalApplicationBeneficiaryColumn();
        repairApplicationStatusColumn();
    }

    private void repairLegacySchemeIdColumn(String tableName) {
        Integer columnCount = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = ?
                          AND column_name = 'scheme_id'
                        """,
                Integer.class,
                tableName
        );

        if (columnCount == null || columnCount == 0) {
            return;
        }

        List<Map<String, Object>> foreignKeys = jdbcTemplate.queryForList(
                """
                        SELECT constraint_name
                        FROM information_schema.key_column_usage
                        WHERE table_schema = DATABASE()
                          AND table_name = ?
                          AND column_name = 'scheme_id'
                          AND referenced_table_name IS NOT NULL
                        """,
                tableName
        );

        for (Map<String, Object> foreignKey : foreignKeys) {
            String constraintName = String.valueOf(foreignKey.get("constraint_name"));
            jdbcTemplate.execute("ALTER TABLE " + tableName + " DROP FOREIGN KEY " + constraintName);
        }

        jdbcTemplate.execute("ALTER TABLE " + tableName + " DROP COLUMN scheme_id");
    }

    private void repairOptionalApplicationBeneficiaryColumn() {
        Integer columnCount = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = 'applications'
                          AND column_name = 'beneficiary_id'
                        """,
                Integer.class
        );

        if (columnCount == null || columnCount == 0) {
            return;
        }

        String isNullable = jdbcTemplate.queryForObject(
                """
                        SELECT is_nullable
                        FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = 'applications'
                          AND column_name = 'beneficiary_id'
                        """,
                String.class
        );

        if ("YES".equalsIgnoreCase(isNullable)) {
            return;
        }

        String columnType = jdbcTemplate.queryForObject(
                """
                        SELECT column_type
                        FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = 'applications'
                          AND column_name = 'beneficiary_id'
                        """,
                String.class
        );

        if (columnType == null || columnType.isBlank()) {
            columnType = "BIGINT";
        }

        jdbcTemplate.execute(
                "ALTER TABLE applications MODIFY COLUMN beneficiary_id " + columnType + " NULL"
        );
    }

    private void repairApplicationStatusColumn() {
        Integer columnCount = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = 'applications'
                          AND column_name = 'status'
                        """,
                Integer.class
        );

        if (columnCount == null || columnCount == 0) {
            return;
        }

        String columnType = jdbcTemplate.queryForObject(
                """
                        SELECT column_type
                        FROM information_schema.columns
                        WHERE table_schema = DATABASE()
                          AND table_name = 'applications'
                          AND column_name = 'status'
                        """,
                String.class
        );

        if (columnType != null && columnType.equalsIgnoreCase("varchar(20)")) {
            return;
        }

        jdbcTemplate.execute(
                "ALTER TABLE applications MODIFY COLUMN status VARCHAR(20) NOT NULL"
        );
    }
}
