package com.jobflow.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsDTO {
    private long totalApplications;
    private long inReview;
    private long interviews;
    private long offers;
    private long rejections;
    // Anything past APPLIED, rejections included: the company got back to you
    private long responded;

    // Conversion rates (percentage, one decimal)
    private double responseRate;
    // Interview plus offer, since an offer means you got through the interviews
    private double interviewRate;
    private double offerRate;
}