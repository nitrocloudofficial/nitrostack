import {
    ToolDecorator as Tool,
    ExecutionContext,
    Injectable,
    z,
} from "@nitrostack/core";

import { InvestigationService } from "./investigation.service.js";

const ShowInvestigationsSchema = z.object({ status: z.enum(["Open","In Progress","Resolved"]).optional() });
const ShowInvestigationSchema = z.object({ investigationId: z.string() });
const SearchSchema = z.object({ query: z.string() });
const AssignSchema = z.object({ investigationId: z.string(), analyst: z.string() });
const UpdateStatusSchema = z.object({ investigationId: z.string(), status: z.enum(["Open","In Progress","Resolved"]) });
const AddNoteSchema = z.object({ investigationId: z.string(), author: z.string(), content: z.string() });
const AttachEvidenceSchema = z.object({ investigationId: z.string(), type: z.enum(["Log","PCAP","Screenshot","Memory Dump"]), name: z.string() });

@Injectable({ deps: [InvestigationService] })
export class InvestigationTools {
    constructor(private readonly investigationService: InvestigationService) {}

    @Tool({ name:"show_investigations", description:"Show all investigations.", inputSchema: ShowInvestigationsSchema })
    async showInvestigations(args: z.infer<typeof ShowInvestigationsSchema>, ctx: ExecutionContext) {
        const investigations = args.status ? this.investigationService.getInvestigationsByStatus(args.status) : this.investigationService.getAllInvestigations();
        ctx.logger.info("Showing investigations");
        return { total: investigations.length, investigations };
    }

    @Tool({ name:"show_investigation", description:"Show one investigation.", inputSchema: ShowInvestigationSchema })
    async showInvestigation(args: z.infer<typeof ShowInvestigationSchema>) {
        return { investigation: this.investigationService.getInvestigationById(args.investigationId) };
    }

    @Tool({ name:"search_investigations", description:"Search investigations.", inputSchema: SearchSchema })
    async searchInvestigations(args: z.infer<typeof SearchSchema>) {
        return { investigations: this.investigationService.searchInvestigations(args.query) };
    }

    @Tool({ name:"assign_investigation", description:"Assign investigation.", inputSchema: AssignSchema })
    async assignInvestigation(args: z.infer<typeof AssignSchema>) {
        return { investigation: this.investigationService.assignInvestigation(args.investigationId,args.analyst) };
    }

    @Tool({ name:"update_investigation_status", description:"Update status.", inputSchema: UpdateStatusSchema })
    async updateStatus(args: z.infer<typeof UpdateStatusSchema>) {
        return { investigation: this.investigationService.updateStatus(args.investigationId,args.status) };
    }

    @Tool({ name:"add_investigation_note", description:"Add note.", inputSchema: AddNoteSchema })
    async addNote(args: z.infer<typeof AddNoteSchema>) {
        return { note: this.investigationService.addNote(args.investigationId,args.author,args.content) };
    }

    @Tool({ name:"attach_evidence", description:"Attach evidence.", inputSchema: AttachEvidenceSchema })
    async attachEvidence(args: z.infer<typeof AttachEvidenceSchema>) {
        return { evidence: this.investigationService.addEvidence(args.investigationId,{ type: args.type, name: args.name, collectedAt: new Date().toISOString() }) };
    }

    @Tool({ name:"investigation_summary", description:"Summary.", inputSchema: z.object({}) })
    async investigationSummary() {
        const investigations = this.investigationService.getAllInvestigations();
        return {
            total: investigations.length,
            open: investigations.filter(i=>i.status==="Open").length,
            inProgress: investigations.filter(i=>i.status==="In Progress").length,
            resolved: investigations.filter(i=>i.status==="Resolved").length,
            critical: investigations.filter(i=>i.severity==="Critical").length,
        };
    }
}
