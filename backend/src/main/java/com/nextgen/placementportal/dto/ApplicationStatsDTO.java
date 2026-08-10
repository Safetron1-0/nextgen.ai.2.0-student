package com.nextgen.placementportal.dto;

public class ApplicationStatsDTO {
    private long applied;
    private long shortlisted;
    private long nextRound;
    private long selected;
    private long rejected;
    private long total;

    public ApplicationStatsDTO() {}

    public ApplicationStatsDTO(long applied, long shortlisted, long nextRound, long selected, long rejected) {
        this.applied = applied;
        this.shortlisted = shortlisted;
        this.nextRound = nextRound;
        this.selected = selected;
        this.rejected = rejected;
        this.total = applied + shortlisted + nextRound + selected + rejected;
    }

    // Getters and Setters
    public long getApplied() { return applied; }
    public void setApplied(long applied) { this.applied = applied; }
    public long getShortlisted() { return shortlisted; }
    public void setShortlisted(long shortlisted) { this.shortlisted = shortlisted; }
    public long getNextRound() { return nextRound; }
    public void setNextRound(long nextRound) { this.nextRound = nextRound; }
    public long getSelected() { return selected; }
    public void setSelected(long selected) { this.selected = selected; }
    public long getRejected() { return rejected; }
    public void setRejected(long rejected) { this.rejected = rejected; }
    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }
}
