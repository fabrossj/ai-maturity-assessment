// Placeholder for queue setup
// This will be implemented in a future phase (P4 or later)

export const pdfQueue = {
  add: async (jobName: string, data: any) => {
    console.log(`[Queue] Job added: ${jobName}`, data);
    // Future implementation will use BullMQ or similar
    return { id: `job-${Date.now()}` };
  }
};
