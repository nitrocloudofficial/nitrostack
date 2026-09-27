export class TranscriptService {
    private transcript: any[] = [];

    public addMessage(actor: string, text: string, isFlag: boolean = false) {
        this.transcript.push({ actor, text, isFlag, timestamp: new Date().toISOString() });
    }

    public getTranscript() {
        return this.transcript;
    }

    public getContextString(): string {
        return this.transcript.map(m => `${m.actor}: ${m.text}`).join('\n');
    }
}
