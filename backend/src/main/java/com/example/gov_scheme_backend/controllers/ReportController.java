package com.example.gov_scheme_backend.controllers;

import com.example.gov_scheme_backend.dto.response.disbursement.OverdueMilestoneResponse;
import com.example.gov_scheme_backend.services.DisbursementService;
import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    @Autowired
    private DisbursementService disbursementService;

    @GetMapping("/overdue")
    public ResponseEntity<List<OverdueMilestoneResponse>> getOverdueMilestonesReport() {
        return ResponseEntity.ok(disbursementService.getOverdueMilestonesReport());
    }
    @PostMapping("/overdue/check")
    public ResponseEntity<String> checkOverdueMilestones() {
        disbursementService.flagOverdueMilestones();
        return ResponseEntity.ok("Overdue milestone check completed");
    }

    @GetMapping("/overdue/pdf")
    public ResponseEntity<byte[]> downloadOverdueMilestonesPdf() {

        List<OverdueMilestoneResponse> overdueMilestones =
                disbursementService.getOverdueMilestonesReport();

        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            Document document = new Document();
            PdfWriter.getInstance(document, outputStream);

            document.open();

            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
            Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD);
            Font bodyFont = new Font(Font.HELVETICA, 9);

            Paragraph title = new Paragraph(
                    "Overdue Milestones Report",
                    titleFont
            );

            title.setAlignment(Paragraph.ALIGN_CENTER);
            document.add(title);

            document.add(new Paragraph(
                    "Generated on: " + LocalDate.now()
            ));

            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);

            addHeaderCell(table, "Milestone ID", headerFont);
            addHeaderCell(table, "Beneficiary", headerFont);
            addHeaderCell(table, "Scheme", headerFont);
            addHeaderCell(table, "Milestone", headerFont);
            addHeaderCell(table, "Due Date", headerFont);
            addHeaderCell(table, "Days Overdue", headerFont);

            if (overdueMilestones.isEmpty()) {

                PdfPCell emptyCell = new PdfPCell(
                        new Phrase("No overdue milestones found.", bodyFont)
                );

                emptyCell.setColspan(6);
                emptyCell.setHorizontalAlignment(PdfPCell.ALIGN_CENTER);

                table.addCell(emptyCell);

            } else {

                for (OverdueMilestoneResponse milestone : overdueMilestones) {

                    table.addCell(new Phrase(
                            String.valueOf(milestone.getMilestoneId()),
                            bodyFont
                    ));

                    table.addCell(new Phrase(
                            milestone.getBeneficiaryName(),
                            bodyFont
                    ));

                    table.addCell(new Phrase(
                            milestone.getSchemeName(),
                            bodyFont
                    ));

                    table.addCell(new Phrase(
                            milestone.getMilestoneName(),
                            bodyFont
                    ));

                    table.addCell(new Phrase(
                            String.valueOf(milestone.getDueDate()),
                            bodyFont
                    ));

                    table.addCell(new Phrase(
                            String.valueOf(milestone.getDaysOverdue()),
                            bodyFont
                    ));
                }
            }

            document.add(table);

            document.add(new Paragraph(" "));
            document.add(new Paragraph(
                    "Total overdue milestones: " + overdueMilestones.size()
            ));

            document.close();

            return ResponseEntity.ok()
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=overdue-milestones-report.pdf"
                    )
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(outputStream.toByteArray());

        } catch (Exception e) {
            throw new RuntimeException(
                    "Failed to generate overdue milestones PDF",
                    e
            );
        }
    }

    private void addHeaderCell(
            PdfPTable table,
            String text,
            Font font
    ) {
        PdfPCell cell = new PdfPCell(
                new Phrase(text, font)
        );

        cell.setHorizontalAlignment(PdfPCell.ALIGN_CENTER);
        cell.setPadding(5);

        table.addCell(cell);
    }
}