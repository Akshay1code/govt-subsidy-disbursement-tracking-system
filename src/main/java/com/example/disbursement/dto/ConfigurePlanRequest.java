package com.example.disbursement.dto;

import java.time.LocalDate;
import java.util.List;

public class ConfigurePlanRequest {
    public static class Stage {
        public String milestoneName;
        public Long amount;
        public LocalDate dueDate;
    }

    public List<Stage> stages;
}
