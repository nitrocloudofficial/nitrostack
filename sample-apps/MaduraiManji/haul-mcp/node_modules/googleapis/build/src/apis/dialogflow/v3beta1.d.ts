import { OAuth2Client, JWT, Compute, UserRefreshClient, BaseExternalAccountClient, GaxiosResponseWithHTTP2, GoogleConfigurable, MethodOptions, StreamMethodOptions, GlobalOptions, GoogleAuth, BodyResponseCallback, APIRequestContext } from 'googleapis-common';
import { Readable } from 'stream';
export declare namespace dialogflow_v3beta1 {
    export interface Options extends GlobalOptions {
        version: 'v3beta1';
    }
    interface StandardParameters {
        /**
         * Auth client or API Key for the request
         */
        auth?: string | OAuth2Client | JWT | Compute | UserRefreshClient | BaseExternalAccountClient | GoogleAuth;
        /**
         * V1 error format.
         */
        '$.xgafv'?: string;
        /**
         * OAuth access token.
         */
        access_token?: string;
        /**
         * Data format for response.
         */
        alt?: string;
        /**
         * JSONP
         */
        callback?: string;
        /**
         * Selector specifying which fields to include in a partial response.
         */
        fields?: string;
        /**
         * API key. Your API key identifies your project and provides you with API access, quota, and reports. Required unless you provide an OAuth 2.0 token.
         */
        key?: string;
        /**
         * OAuth 2.0 token for the current user.
         */
        oauth_token?: string;
        /**
         * Returns response with indentations and line breaks.
         */
        prettyPrint?: boolean;
        /**
         * Available to use for quota purposes for server-side applications. Can be any arbitrary string assigned to a user, but should not exceed 40 characters.
         */
        quotaUser?: string;
        /**
         * Legacy upload protocol for media (e.g. "media", "multipart").
         */
        uploadType?: string;
        /**
         * Upload protocol for media (e.g. "raw", "multipart").
         */
        upload_protocol?: string;
    }
    /**
     * Dialogflow API
     *
     * Builds conversational interfaces (for example, chatbots, and voice-powered apps and devices).
     *
     * @example
     * ```js
     * const {google} = require('googleapis');
     * const dialogflow = google.dialogflow('v3beta1');
     * ```
     */
    export class Dialogflow {
        context: APIRequestContext;
        projects: Resource$Projects;
        constructor(options: GlobalOptions, google?: GoogleConfigurable);
    }
    export interface Schema$GoogleCloudDialogflowCxV3AdvancedSettings {
        audioExportGcsDestination?: Schema$GoogleCloudDialogflowCxV3GcsDestination;
        dtmfSettings?: Schema$GoogleCloudDialogflowCxV3AdvancedSettingsDtmfSettings;
        loggingSettings?: Schema$GoogleCloudDialogflowCxV3AdvancedSettingsLoggingSettings;
        speechSettings?: Schema$GoogleCloudDialogflowCxV3AdvancedSettingsSpeechSettings;
    }
    export interface Schema$GoogleCloudDialogflowCxV3AdvancedSettingsDtmfSettings {
        enabled?: boolean | null;
        endpointingTimeoutDuration?: string | null;
        finishDigit?: string | null;
        interdigitTimeoutDuration?: string | null;
        maxDigits?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3AdvancedSettingsLoggingSettings {
        enableConsentBasedRedaction?: boolean | null;
        enableInteractionLogging?: boolean | null;
        enableStackdriverLogging?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3AdvancedSettingsSpeechSettings {
        endpointerSensitivity?: number | null;
        models?: {
            [key: string]: string;
        } | null;
        noSpeechTimeout?: string | null;
        useTimeoutBasedEndpointing?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3AudioInput {
        audio?: string | null;
        config?: Schema$GoogleCloudDialogflowCxV3InputAudioConfig;
    }
    export interface Schema$GoogleCloudDialogflowCxV3BargeInConfig {
        noBargeInDuration?: string | null;
        totalDuration?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3BatchRunTestCasesMetadata {
        errors?: Schema$GoogleCloudDialogflowCxV3TestError[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3BatchRunTestCasesResponse {
        results?: Schema$GoogleCloudDialogflowCxV3TestCaseResult[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Action {
        agentUtterance?: Schema$GoogleCloudDialogflowCxV3beta1AgentUtterance;
        completeTime?: string | null;
        displayName?: string | null;
        event?: Schema$GoogleCloudDialogflowCxV3beta1Event;
        flowInvocation?: Schema$GoogleCloudDialogflowCxV3beta1FlowInvocation;
        flowStateUpdate?: Schema$GoogleCloudDialogflowCxV3beta1ActionFlowStateUpdate;
        flowTransition?: Schema$GoogleCloudDialogflowCxV3beta1FlowTransition;
        intentMatch?: Schema$GoogleCloudDialogflowCxV3beta1ActionIntentMatch;
        llmCall?: Schema$GoogleCloudDialogflowCxV3beta1LlmCall;
        playbookInvocation?: Schema$GoogleCloudDialogflowCxV3beta1PlaybookInvocation;
        playbookTransition?: Schema$GoogleCloudDialogflowCxV3beta1PlaybookTransition;
        startTime?: string | null;
        status?: Schema$GoogleCloudDialogflowCxV3beta1Status;
        stt?: Schema$GoogleCloudDialogflowCxV3beta1ActionSTT;
        subExecutionSteps?: Schema$GoogleCloudDialogflowCxV3beta1Span[];
        toolUse?: Schema$GoogleCloudDialogflowCxV3beta1ToolUse;
        tts?: Schema$GoogleCloudDialogflowCxV3beta1ActionTTS;
        userUtterance?: Schema$GoogleCloudDialogflowCxV3beta1UserUtterance;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ActionFlowStateUpdate {
        destination?: string | null;
        eventType?: string | null;
        functionCall?: Schema$GoogleCloudDialogflowCxV3beta1ActionFlowStateUpdateFunctionCall;
        pageState?: Schema$GoogleCloudDialogflowCxV3beta1ActionFlowStateUpdatePageState;
        updatedParameters?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ActionFlowStateUpdateFunctionCall {
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ActionFlowStateUpdatePageState {
        displayName?: string | null;
        page?: string | null;
        status?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ActionIntentMatch {
        matchedIntents?: Schema$GoogleCloudDialogflowCxV3beta1ActionIntentMatchMatchedIntent[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ActionIntentMatchMatchedIntent {
        displayName?: string | null;
        generativeFallback?: {
            [key: string]: any;
        } | null;
        intentId?: string | null;
        score?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ActionSTT {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ActionTTS {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AdvancedSettings {
        audioExportGcsDestination?: Schema$GoogleCloudDialogflowCxV3beta1GcsDestination;
        dtmfSettings?: Schema$GoogleCloudDialogflowCxV3beta1AdvancedSettingsDtmfSettings;
        loggingSettings?: Schema$GoogleCloudDialogflowCxV3beta1AdvancedSettingsLoggingSettings;
        speechSettings?: Schema$GoogleCloudDialogflowCxV3beta1AdvancedSettingsSpeechSettings;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AdvancedSettingsDtmfSettings {
        enabled?: boolean | null;
        endpointingTimeoutDuration?: string | null;
        finishDigit?: string | null;
        interdigitTimeoutDuration?: string | null;
        maxDigits?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AdvancedSettingsLoggingSettings {
        enableConsentBasedRedaction?: boolean | null;
        enableInteractionLogging?: boolean | null;
        enableStackdriverLogging?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AdvancedSettingsSpeechSettings {
        endpointerSensitivity?: number | null;
        models?: {
            [key: string]: string;
        } | null;
        noSpeechTimeout?: string | null;
        useTimeoutBasedEndpointing?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Agent {
        advancedSettings?: Schema$GoogleCloudDialogflowCxV3beta1AdvancedSettings;
        answerFeedbackSettings?: Schema$GoogleCloudDialogflowCxV3beta1AgentAnswerFeedbackSettings;
        avatarUri?: string | null;
        bigqueryExportSettings?: Schema$GoogleCloudDialogflowCxV3beta1BigQueryExportSettings;
        clientCertificateSettings?: Schema$GoogleCloudDialogflowCxV3beta1AgentClientCertificateSettings;
        defaultLanguageCode?: string | null;
        description?: string | null;
        displayName?: string | null;
        enableMultiLanguageTraining?: boolean | null;
        enableSpellCorrection?: boolean | null;
        enableStackdriverLogging?: boolean | null;
        genAppBuilderSettings?: Schema$GoogleCloudDialogflowCxV3beta1AgentGenAppBuilderSettings;
        gitIntegrationSettings?: Schema$GoogleCloudDialogflowCxV3beta1AgentGitIntegrationSettings;
        locked?: boolean | null;
        name?: string | null;
        personalizationSettings?: Schema$GoogleCloudDialogflowCxV3beta1AgentPersonalizationSettings;
        satisfiesPzi?: boolean | null;
        satisfiesPzs?: boolean | null;
        securitySettings?: string | null;
        speechToTextSettings?: Schema$GoogleCloudDialogflowCxV3beta1SpeechToTextSettings;
        startFlow?: string | null;
        startPlaybook?: string | null;
        supportedLanguageCodes?: string[] | null;
        textToSpeechSettings?: Schema$GoogleCloudDialogflowCxV3beta1TextToSpeechSettings;
        timeZone?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AgentAnswerFeedbackSettings {
        enableAnswerFeedback?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AgentClientCertificateSettings {
        passphrase?: string | null;
        privateKey?: string | null;
        sslCertificate?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AgentGenAppBuilderSettings {
        engine?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AgentGitIntegrationSettings {
        gitConnectionSettings?: Schema$GoogleCloudDialogflowCxV3beta1AgentGitIntegrationSettingsGitConnectionSettings;
        githubSettings?: Schema$GoogleCloudDialogflowCxV3beta1AgentGitIntegrationSettingsGithubSettings;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AgentGitIntegrationSettingsGitConnectionSettings {
        accessTokenSecret?: string | null;
        branches?: string[] | null;
        displayName?: string | null;
        repositoryUri?: string | null;
        trackingBranch?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AgentGitIntegrationSettingsGithubSettings {
        accessToken?: string | null;
        branches?: string[] | null;
        displayName?: string | null;
        repositoryUri?: string | null;
        trackingBranch?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AgentPersonalizationSettings {
        defaultEndUserMetadata?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AgentUtterance {
        requireGeneration?: boolean | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AgentValidationResult {
        flowValidationResults?: Schema$GoogleCloudDialogflowCxV3beta1FlowValidationResult[];
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AnswerFeedback {
        customRating?: string | null;
        rating?: string | null;
        ratingReason?: Schema$GoogleCloudDialogflowCxV3beta1AnswerFeedbackRatingReason;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AnswerFeedbackRatingReason {
        feedback?: string | null;
        reasonLabels?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1AudioInput {
        audio?: string | null;
        config?: Schema$GoogleCloudDialogflowCxV3beta1InputAudioConfig;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1BargeInConfig {
        noBargeInDuration?: string | null;
        totalDuration?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1BatchDeleteTestCasesRequest {
        names?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1BatchRunTestCasesMetadata {
        errors?: Schema$GoogleCloudDialogflowCxV3beta1TestError[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1BatchRunTestCasesRequest {
        environment?: string | null;
        testCases?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1BatchRunTestCasesResponse {
        results?: Schema$GoogleCloudDialogflowCxV3beta1TestCaseResult[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1BigQueryExportSettings {
        bigqueryTable?: string | null;
        enabled?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1BoostSpec {
        conditionBoostSpecs?: Schema$GoogleCloudDialogflowCxV3beta1BoostSpecConditionBoostSpec[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1BoostSpecConditionBoostSpec {
        boost?: number | null;
        boostControlSpec?: Schema$GoogleCloudDialogflowCxV3beta1BoostSpecConditionBoostSpecBoostControlSpec;
        condition?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1BoostSpecConditionBoostSpecBoostControlSpec {
        attributeType?: string | null;
        controlPoints?: Schema$GoogleCloudDialogflowCxV3beta1BoostSpecConditionBoostSpecBoostControlSpecControlPoint[];
        fieldName?: string | null;
        interpolationType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1BoostSpecConditionBoostSpecBoostControlSpecControlPoint {
        attributeValue?: string | null;
        boostAmount?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1BoostSpecs {
        dataStores?: string[] | null;
        spec?: Schema$GoogleCloudDialogflowCxV3beta1BoostSpec[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1CalculateCoverageResponse {
        agent?: string | null;
        intentCoverage?: Schema$GoogleCloudDialogflowCxV3beta1IntentCoverage;
        routeGroupCoverage?: Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroupCoverage;
        transitionCoverage?: Schema$GoogleCloudDialogflowCxV3beta1TransitionCoverage;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Changelog {
        action?: string | null;
        createTime?: string | null;
        displayName?: string | null;
        languageCode?: string | null;
        name?: string | null;
        resource?: string | null;
        type?: string | null;
        userEmail?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1CodeBlock {
        code?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1CompareVersionsRequest {
        languageCode?: string | null;
        targetVersion?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1CompareVersionsResponse {
        baseVersionContentJson?: string | null;
        compareTime?: string | null;
        targetVersionContentJson?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ContinuousTestResult {
        name?: string | null;
        result?: string | null;
        runTime?: string | null;
        testCaseResults?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Conversation {
        duration?: string | null;
        environment?: Schema$GoogleCloudDialogflowCxV3beta1Environment;
        flows?: Schema$GoogleCloudDialogflowCxV3beta1Flow[];
        flowVersions?: {
            [key: string]: string;
        } | null;
        intents?: Schema$GoogleCloudDialogflowCxV3beta1Intent[];
        interactions?: Schema$GoogleCloudDialogflowCxV3beta1ConversationInteraction[];
        languageCode?: string | null;
        metrics?: Schema$GoogleCloudDialogflowCxV3beta1ConversationMetrics;
        name?: string | null;
        pages?: Schema$GoogleCloudDialogflowCxV3beta1Page[];
        startTime?: string | null;
        type?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ConversationInteraction {
        answerFeedback?: Schema$GoogleCloudDialogflowCxV3beta1AnswerFeedback;
        createTime?: string | null;
        missingTransition?: Schema$GoogleCloudDialogflowCxV3beta1ConversationInteractionMissingTransition;
        partialResponses?: Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse[];
        request?: Schema$GoogleCloudDialogflowCxV3beta1DetectIntentRequest;
        requestUtterances?: string | null;
        response?: Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse;
        responseUtterances?: string | null;
        stepMetrics?: Schema$GoogleCloudDialogflowCxV3beta1ConversationInteractionStepMetrics[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ConversationInteractionMissingTransition {
        intentDisplayName?: string | null;
        score?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ConversationInteractionStepMetrics {
        latency?: string | null;
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ConversationMetrics {
        averageMatchConfidence?: number | null;
        hasEndInteraction?: boolean | null;
        hasLiveAgentHandoff?: boolean | null;
        inputAudioDuration?: string | null;
        interactionCount?: number | null;
        matchTypeCount?: Schema$GoogleCloudDialogflowCxV3beta1ConversationMetricsMatchTypeCount;
        maxWebhookLatency?: string | null;
        outputAudioDuration?: string | null;
        queryInputCount?: Schema$GoogleCloudDialogflowCxV3beta1ConversationMetricsQueryInputCount;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ConversationMetricsMatchTypeCount {
        directIntentCount?: number | null;
        eventCount?: number | null;
        intentCount?: number | null;
        noInputCount?: number | null;
        noMatchCount?: number | null;
        parameterFillingCount?: number | null;
        unspecifiedCount?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ConversationMetricsQueryInputCount {
        audioCount?: number | null;
        dtmfCount?: number | null;
        eventCount?: number | null;
        intentCount?: number | null;
        textCount?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ConversationSignals {
        turnSignals?: Schema$GoogleCloudDialogflowCxV3beta1TurnSignals;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ConversationTurn {
        userInput?: Schema$GoogleCloudDialogflowCxV3beta1ConversationTurnUserInput;
        virtualAgentOutput?: Schema$GoogleCloudDialogflowCxV3beta1ConversationTurnVirtualAgentOutput;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ConversationTurnUserInput {
        enableSentimentAnalysis?: boolean | null;
        injectedParameters?: {
            [key: string]: any;
        } | null;
        input?: Schema$GoogleCloudDialogflowCxV3beta1QueryInput;
        isWebhookEnabled?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ConversationTurnVirtualAgentOutput {
        currentPage?: Schema$GoogleCloudDialogflowCxV3beta1Page;
        diagnosticInfo?: {
            [key: string]: any;
        } | null;
        differences?: Schema$GoogleCloudDialogflowCxV3beta1TestRunDifference[];
        sessionParameters?: {
            [key: string]: any;
        } | null;
        status?: Schema$GoogleRpcStatus;
        textResponses?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageText[];
        triggeredIntent?: Schema$GoogleCloudDialogflowCxV3beta1Intent;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1CreateVersionOperationMetadata {
        version?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnection {
        dataStore?: string | null;
        dataStoreType?: string | null;
        documentProcessingMode?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignals {
        answer?: string | null;
        answerGenerationModelCallSignals?: Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsAnswerGenerationModelCallSignals;
        answerParts?: Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsAnswerPart[];
        citedSnippets?: Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsCitedSnippet[];
        groundingSignals?: Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsGroundingSignals;
        rewriterModelCallSignals?: Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsRewriterModelCallSignals;
        rewrittenQuery?: string | null;
        safetySignals?: Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsSafetySignals;
        searchSnippets?: Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsSearchSnippet[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsAnswerGenerationModelCallSignals {
        model?: string | null;
        modelOutput?: string | null;
        renderedPrompt?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsAnswerPart {
        supportingIndices?: number[] | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsCitedSnippet {
        searchSnippet?: Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsSearchSnippet;
        snippetIndex?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsGroundingSignals {
        decision?: string | null;
        score?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsRewriterModelCallSignals {
        model?: string | null;
        modelOutput?: string | null;
        renderedPrompt?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsSafetySignals {
        bannedPhraseMatch?: string | null;
        decision?: string | null;
        matchedBannedPhrase?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignalsSearchSnippet {
        documentTitle?: string | null;
        documentUri?: string | null;
        metadata?: {
            [key: string]: any;
        } | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DeployFlowMetadata {
        testErrors?: Schema$GoogleCloudDialogflowCxV3beta1TestError[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DeployFlowRequest {
        flowVersion?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DeployFlowResponse {
        deployment?: string | null;
        environment?: Schema$GoogleCloudDialogflowCxV3beta1Environment;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Deployment {
        endTime?: string | null;
        flowVersion?: string | null;
        name?: string | null;
        result?: Schema$GoogleCloudDialogflowCxV3beta1DeploymentResult;
        startTime?: string | null;
        state?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DeploymentResult {
        deploymentTestResults?: string[] | null;
        experiment?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DetectIntentRequest {
        outputAudioConfig?: Schema$GoogleCloudDialogflowCxV3beta1OutputAudioConfig;
        queryInput?: Schema$GoogleCloudDialogflowCxV3beta1QueryInput;
        queryParams?: Schema$GoogleCloudDialogflowCxV3beta1QueryParameters;
        responseView?: string | null;
        session?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse {
        allowCancellation?: boolean | null;
        outputAudio?: string | null;
        outputAudioConfig?: Schema$GoogleCloudDialogflowCxV3beta1OutputAudioConfig;
        queryResult?: Schema$GoogleCloudDialogflowCxV3beta1QueryResult;
        responseId?: string | null;
        responseType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1DtmfInput {
        digits?: string | null;
        finishDigit?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1EntityType {
        autoExpansionMode?: string | null;
        displayName?: string | null;
        enableFuzzyExtraction?: boolean | null;
        entities?: Schema$GoogleCloudDialogflowCxV3beta1EntityTypeEntity[];
        excludedPhrases?: Schema$GoogleCloudDialogflowCxV3beta1EntityTypeExcludedPhrase[];
        kind?: string | null;
        name?: string | null;
        redact?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1EntityTypeEntity {
        synonyms?: string[] | null;
        value?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1EntityTypeExcludedPhrase {
        value?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Environment {
        description?: string | null;
        displayName?: string | null;
        name?: string | null;
        testCasesConfig?: Schema$GoogleCloudDialogflowCxV3beta1EnvironmentTestCasesConfig;
        updateTime?: string | null;
        versionConfigs?: Schema$GoogleCloudDialogflowCxV3beta1EnvironmentVersionConfig[];
        webhookConfig?: Schema$GoogleCloudDialogflowCxV3beta1EnvironmentWebhookConfig;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1EnvironmentTestCasesConfig {
        enableContinuousRun?: boolean | null;
        enablePredeploymentRun?: boolean | null;
        testCases?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1EnvironmentVersionConfig {
        version?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1EnvironmentWebhookConfig {
        webhookOverrides?: Schema$GoogleCloudDialogflowCxV3beta1Webhook[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Event {
        event?: string | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1EventHandler {
        event?: string | null;
        name?: string | null;
        targetFlow?: string | null;
        targetPage?: string | null;
        targetPlaybook?: string | null;
        triggerFulfillment?: Schema$GoogleCloudDialogflowCxV3beta1Fulfillment;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1EventInput {
        event?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Example {
        actions?: Schema$GoogleCloudDialogflowCxV3beta1Action[];
        conversationState?: string | null;
        createTime?: string | null;
        description?: string | null;
        displayName?: string | null;
        languageCode?: string | null;
        name?: string | null;
        playbookInput?: Schema$GoogleCloudDialogflowCxV3beta1PlaybookInput;
        playbookOutput?: Schema$GoogleCloudDialogflowCxV3beta1PlaybookOutput;
        tokenCount?: string | null;
        updateTime?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExceptionDetail {
        errorMessage?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Experiment {
        createTime?: string | null;
        definition?: Schema$GoogleCloudDialogflowCxV3beta1ExperimentDefinition;
        description?: string | null;
        displayName?: string | null;
        endTime?: string | null;
        experimentLength?: string | null;
        lastUpdateTime?: string | null;
        name?: string | null;
        result?: Schema$GoogleCloudDialogflowCxV3beta1ExperimentResult;
        rolloutConfig?: Schema$GoogleCloudDialogflowCxV3beta1RolloutConfig;
        rolloutFailureReason?: string | null;
        rolloutState?: Schema$GoogleCloudDialogflowCxV3beta1RolloutState;
        startTime?: string | null;
        state?: string | null;
        variantsHistory?: Schema$GoogleCloudDialogflowCxV3beta1VariantsHistory[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExperimentDefinition {
        condition?: string | null;
        versionVariants?: Schema$GoogleCloudDialogflowCxV3beta1VersionVariants;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExperimentResult {
        lastUpdateTime?: string | null;
        versionMetrics?: Schema$GoogleCloudDialogflowCxV3beta1ExperimentResultVersionMetrics[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExperimentResultConfidenceInterval {
        confidenceLevel?: number | null;
        lowerBound?: number | null;
        ratio?: number | null;
        upperBound?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExperimentResultMetric {
        confidenceInterval?: Schema$GoogleCloudDialogflowCxV3beta1ExperimentResultConfidenceInterval;
        count?: number | null;
        countType?: string | null;
        ratio?: number | null;
        type?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExperimentResultVersionMetrics {
        metrics?: Schema$GoogleCloudDialogflowCxV3beta1ExperimentResultMetric[];
        sessionCount?: number | null;
        version?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportAgentRequest {
        agentUri?: string | null;
        dataFormat?: string | null;
        environment?: string | null;
        gitDestination?: Schema$GoogleCloudDialogflowCxV3beta1ExportAgentRequestGitDestination;
        includeBigqueryExportSettings?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportAgentRequestGitDestination {
        commitMessage?: string | null;
        trackingBranch?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportAgentResponse {
        agentContent?: string | null;
        agentUri?: string | null;
        commitSha?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportEntityTypesMetadata {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportEntityTypesRequest {
        dataFormat?: string | null;
        entityTypes?: string[] | null;
        entityTypesContentInline?: boolean | null;
        entityTypesUri?: string | null;
        languageCode?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportEntityTypesResponse {
        entityTypesContent?: Schema$GoogleCloudDialogflowCxV3beta1InlineDestination;
        entityTypesUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportFlowRequest {
        flowUri?: string | null;
        includeReferencedFlows?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportFlowResponse {
        flowContent?: string | null;
        flowUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportIntentsMetadata {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportIntentsRequest {
        dataFormat?: string | null;
        intents?: string[] | null;
        intentsContentInline?: boolean | null;
        intentsUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportIntentsResponse {
        intentsContent?: Schema$GoogleCloudDialogflowCxV3beta1InlineDestination;
        intentsUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportPlaybookRequest {
        dataFormat?: string | null;
        playbookUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportTestCasesMetadata {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportTestCasesRequest {
        dataFormat?: string | null;
        filter?: string | null;
        gcsUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportTestCasesResponse {
        content?: string | null;
        gcsUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ExportToolsRequest {
        dataFormat?: string | null;
        tools?: string[] | null;
        toolsContentInline?: boolean | null;
        toolsUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FilterSpecs {
        dataStores?: string[] | null;
        filter?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Flow {
        advancedSettings?: Schema$GoogleCloudDialogflowCxV3beta1AdvancedSettings;
        description?: string | null;
        displayName?: string | null;
        eventHandlers?: Schema$GoogleCloudDialogflowCxV3beta1EventHandler[];
        inputParameterDefinitions?: Schema$GoogleCloudDialogflowCxV3beta1ParameterDefinition[];
        knowledgeConnectorSettings?: Schema$GoogleCloudDialogflowCxV3beta1KnowledgeConnectorSettings;
        locked?: boolean | null;
        multiLanguageSettings?: Schema$GoogleCloudDialogflowCxV3beta1FlowMultiLanguageSettings;
        name?: string | null;
        nluSettings?: Schema$GoogleCloudDialogflowCxV3beta1NluSettings;
        outputParameterDefinitions?: Schema$GoogleCloudDialogflowCxV3beta1ParameterDefinition[];
        transitionRouteGroups?: string[] | null;
        transitionRoutes?: Schema$GoogleCloudDialogflowCxV3beta1TransitionRoute[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FlowImportStrategy {
        globalImportStrategy?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FlowInvocation {
        displayName?: string | null;
        flow?: string | null;
        flowState?: string | null;
        inputActionParameters?: {
            [key: string]: any;
        } | null;
        outputActionParameters?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FlowMultiLanguageSettings {
        enableMultiLanguageDetection?: boolean | null;
        supportedResponseLanguageCodes?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FlowTraceMetadata {
        displayName?: string | null;
        flow?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FlowTransition {
        displayName?: string | null;
        flow?: string | null;
        inputActionParameters?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FlowValidationResult {
        name?: string | null;
        updateTime?: string | null;
        validationMessages?: Schema$GoogleCloudDialogflowCxV3beta1ValidationMessage[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Form {
        parameters?: Schema$GoogleCloudDialogflowCxV3beta1FormParameter[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FormParameter {
        advancedSettings?: Schema$GoogleCloudDialogflowCxV3beta1AdvancedSettings;
        defaultValue?: any | null;
        displayName?: string | null;
        entityType?: string | null;
        fillBehavior?: Schema$GoogleCloudDialogflowCxV3beta1FormParameterFillBehavior;
        isList?: boolean | null;
        redact?: boolean | null;
        required?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FormParameterFillBehavior {
        initialPromptFulfillment?: Schema$GoogleCloudDialogflowCxV3beta1Fulfillment;
        repromptEventHandlers?: Schema$GoogleCloudDialogflowCxV3beta1EventHandler[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FulfillIntentRequest {
        match?: Schema$GoogleCloudDialogflowCxV3beta1Match;
        matchIntentRequest?: Schema$GoogleCloudDialogflowCxV3beta1MatchIntentRequest;
        outputAudioConfig?: Schema$GoogleCloudDialogflowCxV3beta1OutputAudioConfig;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FulfillIntentResponse {
        outputAudio?: string | null;
        outputAudioConfig?: Schema$GoogleCloudDialogflowCxV3beta1OutputAudioConfig;
        queryResult?: Schema$GoogleCloudDialogflowCxV3beta1QueryResult;
        responseId?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Fulfillment {
        advancedSettings?: Schema$GoogleCloudDialogflowCxV3beta1AdvancedSettings;
        conditionalCases?: Schema$GoogleCloudDialogflowCxV3beta1FulfillmentConditionalCases[];
        enableGenerativeFallback?: boolean | null;
        generators?: Schema$GoogleCloudDialogflowCxV3beta1FulfillmentGeneratorSettings[];
        messages?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessage[];
        returnPartialResponses?: boolean | null;
        setParameterActions?: Schema$GoogleCloudDialogflowCxV3beta1FulfillmentSetParameterAction[];
        tag?: string | null;
        webhook?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FulfillmentConditionalCases {
        cases?: Schema$GoogleCloudDialogflowCxV3beta1FulfillmentConditionalCasesCase[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FulfillmentConditionalCasesCase {
        caseContent?: Schema$GoogleCloudDialogflowCxV3beta1FulfillmentConditionalCasesCaseCaseContent[];
        condition?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FulfillmentConditionalCasesCaseCaseContent {
        additionalCases?: Schema$GoogleCloudDialogflowCxV3beta1FulfillmentConditionalCases;
        message?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessage;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FulfillmentGeneratorSettings {
        generator?: string | null;
        inputParameters?: {
            [key: string]: string;
        } | null;
        outputParameter?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1FulfillmentSetParameterAction {
        parameter?: string | null;
        value?: any | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1GcsDestination {
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1GenerativeInfo {
        actionTracingInfo?: Schema$GoogleCloudDialogflowCxV3beta1Example;
        currentPlaybooks?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettings {
        fallbackSettings?: Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettingsFallbackSettings;
        generativeSafetySettings?: Schema$GoogleCloudDialogflowCxV3beta1SafetySettings;
        knowledgeConnectorSettings?: Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettingsKnowledgeConnectorSettings;
        languageCode?: string | null;
        llmModelSettings?: Schema$GoogleCloudDialogflowCxV3beta1LlmModelSettings;
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettingsFallbackSettings {
        promptTemplates?: Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettingsFallbackSettingsPromptTemplate[];
        selectedPrompt?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettingsFallbackSettingsPromptTemplate {
        displayName?: string | null;
        frozen?: boolean | null;
        promptText?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettingsKnowledgeConnectorSettings {
        agent?: string | null;
        agentIdentity?: string | null;
        agentScope?: string | null;
        business?: string | null;
        businessDescription?: string | null;
        disableDataStoreFallback?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Generator {
        displayName?: string | null;
        llmModelSettings?: Schema$GoogleCloudDialogflowCxV3beta1LlmModelSettings;
        modelParameter?: Schema$GoogleCloudDialogflowCxV3beta1GeneratorModelParameter;
        name?: string | null;
        placeholders?: Schema$GoogleCloudDialogflowCxV3beta1GeneratorPlaceholder[];
        promptText?: Schema$GoogleCloudDialogflowCxV3beta1Phrase;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1GeneratorModelParameter {
        maxDecodeSteps?: number | null;
        temperature?: number | null;
        topK?: number | null;
        topP?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1GeneratorPlaceholder {
        id?: string | null;
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Handler {
        eventHandler?: Schema$GoogleCloudDialogflowCxV3beta1HandlerEventHandler;
        lifecycleHandler?: Schema$GoogleCloudDialogflowCxV3beta1HandlerLifecycleHandler;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1HandlerEventHandler {
        condition?: string | null;
        event?: string | null;
        fulfillment?: Schema$GoogleCloudDialogflowCxV3beta1Fulfillment;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1HandlerLifecycleHandler {
        condition?: string | null;
        fulfillment?: Schema$GoogleCloudDialogflowCxV3beta1Fulfillment;
        lifecycleStage?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ImportEntityTypesMetadata {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ImportEntityTypesRequest {
        entityTypesContent?: Schema$GoogleCloudDialogflowCxV3beta1InlineSource;
        entityTypesUri?: string | null;
        mergeOption?: string | null;
        targetEntityType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ImportEntityTypesResponse {
        conflictingResources?: Schema$GoogleCloudDialogflowCxV3beta1ImportEntityTypesResponseConflictingResources;
        entityTypes?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ImportEntityTypesResponseConflictingResources {
        entityDisplayNames?: string[] | null;
        entityTypeDisplayNames?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ImportFlowRequest {
        flowContent?: string | null;
        flowImportStrategy?: Schema$GoogleCloudDialogflowCxV3beta1FlowImportStrategy;
        flowUri?: string | null;
        importOption?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ImportFlowResponse {
        flow?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ImportIntentsMetadata {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ImportIntentsRequest {
        intentsContent?: Schema$GoogleCloudDialogflowCxV3beta1InlineSource;
        intentsUri?: string | null;
        mergeOption?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ImportIntentsResponse {
        conflictingResources?: Schema$GoogleCloudDialogflowCxV3beta1ImportIntentsResponseConflictingResources;
        intents?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ImportIntentsResponseConflictingResources {
        entityDisplayNames?: string[] | null;
        intentDisplayNames?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ImportPlaybookRequest {
        importStrategy?: Schema$GoogleCloudDialogflowCxV3beta1PlaybookImportStrategy;
        playbookContent?: string | null;
        playbookUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ImportTestCasesMetadata {
        errors?: Schema$GoogleCloudDialogflowCxV3beta1TestCaseError[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ImportTestCasesRequest {
        content?: string | null;
        gcsUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ImportTestCasesResponse {
        names?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1InlineDestination {
        content?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1InlineSchema {
        items?: Schema$GoogleCloudDialogflowCxV3beta1TypeSchema;
        type?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1InlineSource {
        content?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1InputAudioConfig {
        audioEncoding?: string | null;
        bargeInConfig?: Schema$GoogleCloudDialogflowCxV3beta1BargeInConfig;
        enableWordInfo?: boolean | null;
        model?: string | null;
        modelVariant?: string | null;
        optOutConformerModelMigration?: boolean | null;
        phraseHints?: string[] | null;
        sampleRateHertz?: number | null;
        singleUtterance?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Intent {
        description?: string | null;
        displayName?: string | null;
        dtmfPattern?: string | null;
        isFallback?: boolean | null;
        labels?: {
            [key: string]: string;
        } | null;
        name?: string | null;
        parameters?: Schema$GoogleCloudDialogflowCxV3beta1IntentParameter[];
        priority?: number | null;
        trainingPhrases?: Schema$GoogleCloudDialogflowCxV3beta1IntentTrainingPhrase[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1IntentCoverage {
        coverageScore?: number | null;
        intents?: Schema$GoogleCloudDialogflowCxV3beta1IntentCoverageIntent[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1IntentCoverageIntent {
        covered?: boolean | null;
        intent?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1IntentInput {
        intent?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1IntentParameter {
        entityType?: string | null;
        id?: string | null;
        isList?: boolean | null;
        redact?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1IntentTrainingPhrase {
        id?: string | null;
        parts?: Schema$GoogleCloudDialogflowCxV3beta1IntentTrainingPhrasePart[];
        repeatCount?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1IntentTrainingPhrasePart {
        parameterId?: string | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1KnowledgeConnectorSettings {
        dataStoreConnections?: Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnection[];
        enabled?: boolean | null;
        targetFlow?: string | null;
        targetPage?: string | null;
        triggerFulfillment?: Schema$GoogleCloudDialogflowCxV3beta1Fulfillment;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1LanguageInfo {
        confidenceScore?: number | null;
        inputLanguageCode?: string | null;
        resolvedLanguageCode?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListAgentsResponse {
        agents?: Schema$GoogleCloudDialogflowCxV3beta1Agent[];
        nextPageToken?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListChangelogsResponse {
        changelogs?: Schema$GoogleCloudDialogflowCxV3beta1Changelog[];
        nextPageToken?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListContinuousTestResultsResponse {
        continuousTestResults?: Schema$GoogleCloudDialogflowCxV3beta1ContinuousTestResult[];
        nextPageToken?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListConversationsResponse {
        conversations?: Schema$GoogleCloudDialogflowCxV3beta1Conversation[];
        nextPageToken?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListDeploymentsResponse {
        deployments?: Schema$GoogleCloudDialogflowCxV3beta1Deployment[];
        nextPageToken?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListEntityTypesResponse {
        entityTypes?: Schema$GoogleCloudDialogflowCxV3beta1EntityType[];
        nextPageToken?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListEnvironmentsResponse {
        environments?: Schema$GoogleCloudDialogflowCxV3beta1Environment[];
        nextPageToken?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListExamplesResponse {
        examples?: Schema$GoogleCloudDialogflowCxV3beta1Example[];
        nextPageToken?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListExperimentsResponse {
        experiments?: Schema$GoogleCloudDialogflowCxV3beta1Experiment[];
        nextPageToken?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListFlowsResponse {
        flows?: Schema$GoogleCloudDialogflowCxV3beta1Flow[];
        nextPageToken?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListGeneratorsResponse {
        generators?: Schema$GoogleCloudDialogflowCxV3beta1Generator[];
        nextPageToken?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListIntentsResponse {
        intents?: Schema$GoogleCloudDialogflowCxV3beta1Intent[];
        nextPageToken?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListPagesResponse {
        nextPageToken?: string | null;
        pages?: Schema$GoogleCloudDialogflowCxV3beta1Page[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListPlaybooksResponse {
        nextPageToken?: string | null;
        playbooks?: Schema$GoogleCloudDialogflowCxV3beta1Playbook[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListPlaybookVersionsResponse {
        nextPageToken?: string | null;
        playbookVersions?: Schema$GoogleCloudDialogflowCxV3beta1PlaybookVersion[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListSecuritySettingsResponse {
        nextPageToken?: string | null;
        securitySettings?: Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListSessionEntityTypesResponse {
        nextPageToken?: string | null;
        sessionEntityTypes?: Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListTestCaseResultsResponse {
        nextPageToken?: string | null;
        testCaseResults?: Schema$GoogleCloudDialogflowCxV3beta1TestCaseResult[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListTestCasesResponse {
        nextPageToken?: string | null;
        testCases?: Schema$GoogleCloudDialogflowCxV3beta1TestCase[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListToolsResponse {
        nextPageToken?: string | null;
        tools?: Schema$GoogleCloudDialogflowCxV3beta1Tool[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListToolVersionsResponse {
        nextPageToken?: string | null;
        toolVersions?: Schema$GoogleCloudDialogflowCxV3beta1ToolVersion[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListTransitionRouteGroupsResponse {
        nextPageToken?: string | null;
        transitionRouteGroups?: Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListVersionsResponse {
        nextPageToken?: string | null;
        versions?: Schema$GoogleCloudDialogflowCxV3beta1Version[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ListWebhooksResponse {
        nextPageToken?: string | null;
        webhooks?: Schema$GoogleCloudDialogflowCxV3beta1Webhook[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1LlmCall {
        model?: string | null;
        retrievedExamples?: Schema$GoogleCloudDialogflowCxV3beta1LlmCallRetrievedExample[];
        temperature?: number | null;
        tokenCount?: Schema$GoogleCloudDialogflowCxV3beta1LlmCallTokenCount;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1LlmCallRetrievedExample {
        exampleDisplayName?: string | null;
        exampleId?: string | null;
        matchedRetrievalLabel?: string | null;
        retrievalStrategy?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1LlmCallTokenCount {
        conversationContextTokenCount?: string | null;
        exampleTokenCount?: string | null;
        totalInputTokenCount?: string | null;
        totalOutputTokenCount?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1LlmModelSettings {
        model?: string | null;
        parameters?: Schema$GoogleCloudDialogflowCxV3beta1LlmModelSettingsParameters;
        promptText?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1LlmModelSettingsParameters {
        inputTokenLimit?: string | null;
        outputTokenLimit?: string | null;
        temperature?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1LoadVersionRequest {
        allowOverrideAgentResources?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1LookupEnvironmentHistoryResponse {
        environments?: Schema$GoogleCloudDialogflowCxV3beta1Environment[];
        nextPageToken?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Match {
        confidence?: number | null;
        event?: string | null;
        intent?: Schema$GoogleCloudDialogflowCxV3beta1Intent;
        matchType?: string | null;
        parameters?: {
            [key: string]: any;
        } | null;
        resolvedInput?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1MatchIntentRequest {
        persistParameterChanges?: boolean | null;
        queryInput?: Schema$GoogleCloudDialogflowCxV3beta1QueryInput;
        queryParams?: Schema$GoogleCloudDialogflowCxV3beta1QueryParameters;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1MatchIntentResponse {
        currentPage?: Schema$GoogleCloudDialogflowCxV3beta1Page;
        matches?: Schema$GoogleCloudDialogflowCxV3beta1Match[];
        text?: string | null;
        transcript?: string | null;
        triggerEvent?: string | null;
        triggerIntent?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1NamedMetric {
        name?: string | null;
        unit?: string | null;
        value?: any | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1NluSettings {
        classificationThreshold?: number | null;
        modelTrainingMode?: string | null;
        modelType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1OutputAudioConfig {
        audioEncoding?: string | null;
        sampleRateHertz?: number | null;
        synthesizeSpeechConfig?: Schema$GoogleCloudDialogflowCxV3beta1SynthesizeSpeechConfig;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Page {
        advancedSettings?: Schema$GoogleCloudDialogflowCxV3beta1AdvancedSettings;
        description?: string | null;
        displayName?: string | null;
        entryFulfillment?: Schema$GoogleCloudDialogflowCxV3beta1Fulfillment;
        eventHandlers?: Schema$GoogleCloudDialogflowCxV3beta1EventHandler[];
        form?: Schema$GoogleCloudDialogflowCxV3beta1Form;
        knowledgeConnectorSettings?: Schema$GoogleCloudDialogflowCxV3beta1KnowledgeConnectorSettings;
        name?: string | null;
        transitionRouteGroups?: string[] | null;
        transitionRoutes?: Schema$GoogleCloudDialogflowCxV3beta1TransitionRoute[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1PageInfo {
        currentPage?: string | null;
        displayName?: string | null;
        formInfo?: Schema$GoogleCloudDialogflowCxV3beta1PageInfoFormInfo;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1PageInfoFormInfo {
        parameterInfo?: Schema$GoogleCloudDialogflowCxV3beta1PageInfoFormInfoParameterInfo[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1PageInfoFormInfoParameterInfo {
        displayName?: string | null;
        justCollected?: boolean | null;
        required?: boolean | null;
        state?: string | null;
        value?: any | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ParameterDefinition {
        description?: string | null;
        name?: string | null;
        type?: string | null;
        typeSchema?: Schema$GoogleCloudDialogflowCxV3beta1TypeSchema;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Phrase {
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Playbook {
        codeBlock?: Schema$GoogleCloudDialogflowCxV3beta1CodeBlock;
        createTime?: string | null;
        displayName?: string | null;
        goal?: string | null;
        handlers?: Schema$GoogleCloudDialogflowCxV3beta1Handler[];
        inlineActions?: string[] | null;
        inputParameterDefinitions?: Schema$GoogleCloudDialogflowCxV3beta1ParameterDefinition[];
        instruction?: Schema$GoogleCloudDialogflowCxV3beta1PlaybookInstruction;
        llmModelSettings?: Schema$GoogleCloudDialogflowCxV3beta1LlmModelSettings;
        name?: string | null;
        outputParameterDefinitions?: Schema$GoogleCloudDialogflowCxV3beta1ParameterDefinition[];
        playbookType?: string | null;
        referencedFlows?: string[] | null;
        referencedPlaybooks?: string[] | null;
        referencedTools?: string[] | null;
        speechSettings?: Schema$GoogleCloudDialogflowCxV3beta1AdvancedSettingsSpeechSettings;
        tokenCount?: string | null;
        updateTime?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1PlaybookImportStrategy {
        mainPlaybookImportStrategy?: string | null;
        nestedResourceImportStrategy?: string | null;
        toolImportStrategy?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1PlaybookInput {
        actionParameters?: {
            [key: string]: any;
        } | null;
        precedingConversationSummary?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1PlaybookInstruction {
        guidelines?: string | null;
        steps?: Schema$GoogleCloudDialogflowCxV3beta1PlaybookStep[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1PlaybookInvocation {
        displayName?: string | null;
        playbook?: string | null;
        playbookInput?: Schema$GoogleCloudDialogflowCxV3beta1PlaybookInput;
        playbookOutput?: Schema$GoogleCloudDialogflowCxV3beta1PlaybookOutput;
        playbookState?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1PlaybookOutput {
        actionParameters?: {
            [key: string]: any;
        } | null;
        executionSummary?: string | null;
        state?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1PlaybookStep {
        steps?: Schema$GoogleCloudDialogflowCxV3beta1PlaybookStep[];
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1PlaybookTraceMetadata {
        displayName?: string | null;
        playbook?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1PlaybookTransition {
        displayName?: string | null;
        inputActionParameters?: {
            [key: string]: any;
        } | null;
        playbook?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1PlaybookVersion {
        description?: string | null;
        examples?: Schema$GoogleCloudDialogflowCxV3beta1Example[];
        name?: string | null;
        playbook?: Schema$GoogleCloudDialogflowCxV3beta1Playbook;
        updateTime?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1QueryInput {
        audio?: Schema$GoogleCloudDialogflowCxV3beta1AudioInput;
        dtmf?: Schema$GoogleCloudDialogflowCxV3beta1DtmfInput;
        event?: Schema$GoogleCloudDialogflowCxV3beta1EventInput;
        intent?: Schema$GoogleCloudDialogflowCxV3beta1IntentInput;
        languageCode?: string | null;
        text?: Schema$GoogleCloudDialogflowCxV3beta1TextInput;
        toolCallResult?: Schema$GoogleCloudDialogflowCxV3beta1ToolCallResult;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1QueryParameters {
        analyzeQueryTextSentiment?: boolean | null;
        channel?: string | null;
        currentPage?: string | null;
        currentPlaybook?: string | null;
        disableWebhook?: boolean | null;
        endUserMetadata?: {
            [key: string]: any;
        } | null;
        flowVersions?: string[] | null;
        geoLocation?: Schema$GoogleTypeLatLng;
        llmModelSettings?: Schema$GoogleCloudDialogflowCxV3beta1LlmModelSettings;
        parameters?: {
            [key: string]: any;
        } | null;
        parameterScope?: string | null;
        payload?: {
            [key: string]: any;
        } | null;
        populateDataStoreConnectionSignals?: boolean | null;
        searchConfig?: Schema$GoogleCloudDialogflowCxV3beta1SearchConfig;
        sessionEntityTypes?: Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType[];
        sessionTtl?: string | null;
        timeZone?: string | null;
        webhookHeaders?: {
            [key: string]: string;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1QueryResult {
        advancedSettings?: Schema$GoogleCloudDialogflowCxV3beta1AdvancedSettings;
        allowAnswerFeedback?: boolean | null;
        currentFlow?: Schema$GoogleCloudDialogflowCxV3beta1Flow;
        currentPage?: Schema$GoogleCloudDialogflowCxV3beta1Page;
        dataStoreConnectionSignals?: Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignals;
        diagnosticInfo?: {
            [key: string]: any;
        } | null;
        dtmf?: Schema$GoogleCloudDialogflowCxV3beta1DtmfInput;
        generativeInfo?: Schema$GoogleCloudDialogflowCxV3beta1GenerativeInfo;
        intent?: Schema$GoogleCloudDialogflowCxV3beta1Intent;
        intentDetectionConfidence?: number | null;
        languageCode?: string | null;
        match?: Schema$GoogleCloudDialogflowCxV3beta1Match;
        parameters?: {
            [key: string]: any;
        } | null;
        responseMessages?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessage[];
        sentimentAnalysisResult?: Schema$GoogleCloudDialogflowCxV3beta1SentimentAnalysisResult;
        text?: string | null;
        traceBlocks?: Schema$GoogleCloudDialogflowCxV3beta1TraceBlock[];
        transcript?: string | null;
        triggerEvent?: string | null;
        triggerIntent?: string | null;
        webhookDisplayNames?: string[] | null;
        webhookIds?: string[] | null;
        webhookLatencies?: string[] | null;
        webhookPayloads?: Array<{
            [key: string]: any;
        }> | null;
        webhookStatuses?: Schema$GoogleRpcStatus[];
        webhookTags?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ResourceName {
        displayName?: string | null;
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ResponseMessage {
        channel?: string | null;
        conversationSuccess?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageConversationSuccess;
        endInteraction?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageEndInteraction;
        knowledgeInfoCard?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageKnowledgeInfoCard;
        liveAgentHandoff?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageLiveAgentHandoff;
        mixedAudio?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageMixedAudio;
        outputAudioText?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageOutputAudioText;
        payload?: {
            [key: string]: any;
        } | null;
        playAudio?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessagePlayAudio;
        telephonyTransferCall?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageTelephonyTransferCall;
        text?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageText;
        toolCall?: Schema$GoogleCloudDialogflowCxV3beta1ToolCall;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageConversationSuccess {
        metadata?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageEndInteraction {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageKnowledgeInfoCard {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageLiveAgentHandoff {
        metadata?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageMixedAudio {
        segments?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageMixedAudioSegment[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageMixedAudioSegment {
        allowPlaybackInterruption?: boolean | null;
        audio?: string | null;
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageOutputAudioText {
        allowPlaybackInterruption?: boolean | null;
        ssml?: string | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ResponseMessagePlayAudio {
        allowPlaybackInterruption?: boolean | null;
        audioUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageTelephonyTransferCall {
        phoneNumber?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ResponseMessageText {
        allowPlaybackInterruption?: boolean | null;
        text?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RestoreAgentRequest {
        agentContent?: string | null;
        agentUri?: string | null;
        gitSource?: Schema$GoogleCloudDialogflowCxV3beta1RestoreAgentRequestGitSource;
        restoreOption?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RestoreAgentRequestGitSource {
        trackingBranch?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RestorePlaybookVersionRequest {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RestorePlaybookVersionResponse {
        playbook?: Schema$GoogleCloudDialogflowCxV3beta1Playbook;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RestoreToolVersionRequest {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RestoreToolVersionResponse {
        tool?: Schema$GoogleCloudDialogflowCxV3beta1Tool;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RolloutConfig {
        failureCondition?: string | null;
        rolloutCondition?: string | null;
        rolloutSteps?: Schema$GoogleCloudDialogflowCxV3beta1RolloutConfigRolloutStep[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RolloutConfigRolloutStep {
        displayName?: string | null;
        minDuration?: string | null;
        trafficPercent?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RolloutState {
        startTime?: string | null;
        step?: string | null;
        stepIndex?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RunContinuousTestMetadata {
        errors?: Schema$GoogleCloudDialogflowCxV3beta1TestError[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RunContinuousTestRequest {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RunContinuousTestResponse {
        continuousTestResult?: Schema$GoogleCloudDialogflowCxV3beta1ContinuousTestResult;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RunTestCaseMetadata {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RunTestCaseRequest {
        environment?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1RunTestCaseResponse {
        result?: Schema$GoogleCloudDialogflowCxV3beta1TestCaseResult;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SafetySettings {
        bannedPhrases?: Schema$GoogleCloudDialogflowCxV3beta1SafetySettingsPhrase[];
        defaultBannedPhraseMatchStrategy?: string | null;
        defaultRaiSettings?: Schema$GoogleCloudDialogflowCxV3beta1SafetySettingsRaiSettings;
        promptSecuritySettings?: Schema$GoogleCloudDialogflowCxV3beta1SafetySettingsPromptSecuritySettings;
        raiSettings?: Schema$GoogleCloudDialogflowCxV3beta1SafetySettingsRaiSettings;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SafetySettingsPhrase {
        languageCode?: string | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SafetySettingsPromptSecuritySettings {
        enablePromptSecurity?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SafetySettingsRaiSettings {
        categoryFilters?: Schema$GoogleCloudDialogflowCxV3beta1SafetySettingsRaiSettingsCategoryFilter[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SafetySettingsRaiSettingsCategoryFilter {
        category?: string | null;
        filterLevel?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SearchConfig {
        boostSpecs?: Schema$GoogleCloudDialogflowCxV3beta1BoostSpecs[];
        filterSpecs?: Schema$GoogleCloudDialogflowCxV3beta1FilterSpecs[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings {
        audioExportSettings?: Schema$GoogleCloudDialogflowCxV3beta1SecuritySettingsAudioExportSettings;
        deidentifyTemplate?: string | null;
        displayName?: string | null;
        insightsExportSettings?: Schema$GoogleCloudDialogflowCxV3beta1SecuritySettingsInsightsExportSettings;
        inspectTemplate?: string | null;
        name?: string | null;
        purgeDataTypes?: string[] | null;
        redactionScope?: string | null;
        redactionStrategy?: string | null;
        retentionStrategy?: string | null;
        retentionWindowDays?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SecuritySettingsAudioExportSettings {
        audioExportPattern?: string | null;
        audioFormat?: string | null;
        enableAudioRedaction?: boolean | null;
        gcsBucket?: string | null;
        storeTtsAudio?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SecuritySettingsInsightsExportSettings {
        enableInsightsExport?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SentimentAnalysisResult {
        magnitude?: number | null;
        score?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType {
        entities?: Schema$GoogleCloudDialogflowCxV3beta1EntityTypeEntity[];
        entityOverrideMode?: string | null;
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SessionInfo {
        parameters?: {
            [key: string]: any;
        } | null;
        session?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Span {
        completeTime?: string | null;
        metrics?: Schema$GoogleCloudDialogflowCxV3beta1NamedMetric[];
        name?: string | null;
        startTime?: string | null;
        tags?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SpeechProcessingMetadata {
        displayName?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SpeechToTextSettings {
        enableSpeechAdaptation?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1StartExperimentRequest {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Status {
        exception?: Schema$GoogleCloudDialogflowCxV3beta1ExceptionDetail;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1StopExperimentRequest {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SubmitAnswerFeedbackRequest {
        answerFeedback?: Schema$GoogleCloudDialogflowCxV3beta1AnswerFeedback;
        responseId?: string | null;
        updateMask?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1SynthesizeSpeechConfig {
        effectsProfileId?: string[] | null;
        pitch?: number | null;
        speakingRate?: number | null;
        voice?: Schema$GoogleCloudDialogflowCxV3beta1VoiceSelectionParams;
        volumeGainDb?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TestCase {
        creationTime?: string | null;
        displayName?: string | null;
        lastTestResult?: Schema$GoogleCloudDialogflowCxV3beta1TestCaseResult;
        name?: string | null;
        notes?: string | null;
        tags?: string[] | null;
        testCaseConversationTurns?: Schema$GoogleCloudDialogflowCxV3beta1ConversationTurn[];
        testConfig?: Schema$GoogleCloudDialogflowCxV3beta1TestConfig;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TestCaseError {
        status?: Schema$GoogleRpcStatus;
        testCase?: Schema$GoogleCloudDialogflowCxV3beta1TestCase;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TestCaseResult {
        conversationTurns?: Schema$GoogleCloudDialogflowCxV3beta1ConversationTurn[];
        environment?: string | null;
        name?: string | null;
        testResult?: string | null;
        testTime?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TestConfig {
        flow?: string | null;
        page?: string | null;
        trackingParameters?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TestError {
        status?: Schema$GoogleRpcStatus;
        testCase?: string | null;
        testTime?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TestRunDifference {
        description?: string | null;
        type?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TextInput {
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TextToSpeechSettings {
        synthesizeSpeechConfigs?: {
            [key: string]: Schema$GoogleCloudDialogflowCxV3beta1SynthesizeSpeechConfig;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Tool {
        connectorSpec?: Schema$GoogleCloudDialogflowCxV3beta1ToolConnectorTool;
        dataStoreSpec?: Schema$GoogleCloudDialogflowCxV3beta1ToolDataStoreTool;
        description?: string | null;
        displayName?: string | null;
        extensionSpec?: Schema$GoogleCloudDialogflowCxV3beta1ToolExtensionTool;
        functionSpec?: Schema$GoogleCloudDialogflowCxV3beta1ToolFunctionTool;
        name?: string | null;
        openApiSpec?: Schema$GoogleCloudDialogflowCxV3beta1ToolOpenApiTool;
        toolType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolAuthentication {
        apiKeyConfig?: Schema$GoogleCloudDialogflowCxV3beta1ToolAuthenticationApiKeyConfig;
        bearerTokenConfig?: Schema$GoogleCloudDialogflowCxV3beta1ToolAuthenticationBearerTokenConfig;
        oauthConfig?: Schema$GoogleCloudDialogflowCxV3beta1ToolAuthenticationOAuthConfig;
        serviceAccountAuthConfig?: Schema$GoogleCloudDialogflowCxV3beta1ToolAuthenticationServiceAccountAuthConfig;
        serviceAgentAuthConfig?: Schema$GoogleCloudDialogflowCxV3beta1ToolAuthenticationServiceAgentAuthConfig;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolAuthenticationApiKeyConfig {
        apiKey?: string | null;
        keyName?: string | null;
        requestLocation?: string | null;
        secretVersionForApiKey?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolAuthenticationBearerTokenConfig {
        secretVersionForToken?: string | null;
        token?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolAuthenticationOAuthConfig {
        clientId?: string | null;
        clientSecret?: string | null;
        oauthGrantType?: string | null;
        scopes?: string[] | null;
        secretVersionForClientSecret?: string | null;
        tokenEndpoint?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolAuthenticationServiceAccountAuthConfig {
        serviceAccount?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolAuthenticationServiceAgentAuthConfig {
        serviceAgentAuth?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolCall {
        action?: string | null;
        inputParameters?: {
            [key: string]: any;
        } | null;
        tool?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolCallResult {
        action?: string | null;
        error?: Schema$GoogleCloudDialogflowCxV3beta1ToolCallResultError;
        outputParameters?: {
            [key: string]: any;
        } | null;
        tool?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolCallResultError {
        message?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolConnectorTool {
        actions?: Schema$GoogleCloudDialogflowCxV3beta1ToolConnectorToolAction[];
        endUserAuthConfig?: Schema$GoogleCloudDialogflowCxV3beta1ToolEndUserAuthConfig;
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolConnectorToolAction {
        connectionActionId?: string | null;
        entityOperation?: Schema$GoogleCloudDialogflowCxV3beta1ToolConnectorToolActionEntityOperation;
        inputFields?: string[] | null;
        outputFields?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolConnectorToolActionEntityOperation {
        entityId?: string | null;
        operation?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolDataStoreTool {
        dataStoreConnections?: Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnection[];
        fallbackPrompt?: Schema$GoogleCloudDialogflowCxV3beta1ToolDataStoreToolFallbackPrompt;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolDataStoreToolFallbackPrompt {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolEndUserAuthConfig {
        oauth2AuthCodeConfig?: Schema$GoogleCloudDialogflowCxV3beta1ToolEndUserAuthConfigOauth2AuthCodeConfig;
        oauth2JwtBearerConfig?: Schema$GoogleCloudDialogflowCxV3beta1ToolEndUserAuthConfigOauth2JwtBearerConfig;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolEndUserAuthConfigOauth2AuthCodeConfig {
        oauthToken?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolEndUserAuthConfigOauth2JwtBearerConfig {
        clientKey?: string | null;
        issuer?: string | null;
        subject?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolExtensionTool {
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolFunctionTool {
        inputSchema?: {
            [key: string]: any;
        } | null;
        outputSchema?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolOpenApiTool {
        authentication?: Schema$GoogleCloudDialogflowCxV3beta1ToolAuthentication;
        serviceDirectoryConfig?: Schema$GoogleCloudDialogflowCxV3beta1ToolServiceDirectoryConfig;
        textSchema?: string | null;
        tlsConfig?: Schema$GoogleCloudDialogflowCxV3beta1ToolTLSConfig;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolServiceDirectoryConfig {
        service?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolTLSConfig {
        caCerts?: Schema$GoogleCloudDialogflowCxV3beta1ToolTLSConfigCACert[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolTLSConfigCACert {
        cert?: string | null;
        displayName?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolUse {
        action?: string | null;
        dataStoreToolTrace?: Schema$GoogleCloudDialogflowCxV3beta1ToolUseDataStoreToolTrace;
        displayName?: string | null;
        inputActionParameters?: {
            [key: string]: any;
        } | null;
        outputActionParameters?: {
            [key: string]: any;
        } | null;
        tool?: string | null;
        webhookToolTrace?: Schema$GoogleCloudDialogflowCxV3beta1ToolUseWebhookToolTrace;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolUseDataStoreToolTrace {
        dataStoreConnectionSignals?: Schema$GoogleCloudDialogflowCxV3beta1DataStoreConnectionSignals;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolUseWebhookToolTrace {
        webhookTag?: string | null;
        webhookUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ToolVersion {
        createTime?: string | null;
        displayName?: string | null;
        name?: string | null;
        tool?: Schema$GoogleCloudDialogflowCxV3beta1Tool;
        updateTime?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TraceBlock {
        actions?: Schema$GoogleCloudDialogflowCxV3beta1Action[];
        completeTime?: string | null;
        endState?: string | null;
        flowTraceMetadata?: Schema$GoogleCloudDialogflowCxV3beta1FlowTraceMetadata;
        inputParameters?: {
            [key: string]: any;
        } | null;
        outputParameters?: {
            [key: string]: any;
        } | null;
        playbookTraceMetadata?: Schema$GoogleCloudDialogflowCxV3beta1PlaybookTraceMetadata;
        speechProcessingMetadata?: Schema$GoogleCloudDialogflowCxV3beta1SpeechProcessingMetadata;
        startTime?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TrainFlowRequest {
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TransitionCoverage {
        coverageScore?: number | null;
        transitions?: Schema$GoogleCloudDialogflowCxV3beta1TransitionCoverageTransition[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TransitionCoverageTransition {
        covered?: boolean | null;
        eventHandler?: Schema$GoogleCloudDialogflowCxV3beta1EventHandler;
        index?: number | null;
        source?: Schema$GoogleCloudDialogflowCxV3beta1TransitionCoverageTransitionNode;
        target?: Schema$GoogleCloudDialogflowCxV3beta1TransitionCoverageTransitionNode;
        transitionRoute?: Schema$GoogleCloudDialogflowCxV3beta1TransitionRoute;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TransitionCoverageTransitionNode {
        flow?: Schema$GoogleCloudDialogflowCxV3beta1Flow;
        page?: Schema$GoogleCloudDialogflowCxV3beta1Page;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TransitionRoute {
        condition?: string | null;
        description?: string | null;
        intent?: string | null;
        name?: string | null;
        targetFlow?: string | null;
        targetPage?: string | null;
        triggerFulfillment?: Schema$GoogleCloudDialogflowCxV3beta1Fulfillment;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup {
        displayName?: string | null;
        name?: string | null;
        transitionRoutes?: Schema$GoogleCloudDialogflowCxV3beta1TransitionRoute[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroupCoverage {
        coverages?: Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroupCoverageCoverage[];
        coverageScore?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroupCoverageCoverage {
        coverageScore?: number | null;
        routeGroup?: Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup;
        transitions?: Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroupCoverageCoverageTransition[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroupCoverageCoverageTransition {
        covered?: boolean | null;
        transitionRoute?: Schema$GoogleCloudDialogflowCxV3beta1TransitionRoute;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TurnSignals {
        agentEscalated?: boolean | null;
        dtmfUsed?: boolean | null;
        failureReasons?: string[] | null;
        noMatch?: boolean | null;
        noUserInput?: boolean | null;
        reachedEndPage?: boolean | null;
        sentimentMagnitude?: number | null;
        sentimentScore?: number | null;
        userEscalated?: boolean | null;
        webhookStatuses?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TypeSchema {
        inlineSchema?: Schema$GoogleCloudDialogflowCxV3beta1InlineSchema;
        schemaReference?: Schema$GoogleCloudDialogflowCxV3beta1TypeSchemaSchemaReference;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1TypeSchemaSchemaReference {
        schema?: string | null;
        tool?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1UserUtterance {
        audio?: string | null;
        audioTokens?: number[] | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ValidateAgentRequest {
        languageCode?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ValidateFlowRequest {
        languageCode?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1ValidationMessage {
        detail?: string | null;
        resourceNames?: Schema$GoogleCloudDialogflowCxV3beta1ResourceName[];
        resources?: string[] | null;
        resourceType?: string | null;
        severity?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1VariantsHistory {
        updateTime?: string | null;
        versionVariants?: Schema$GoogleCloudDialogflowCxV3beta1VersionVariants;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Version {
        createTime?: string | null;
        description?: string | null;
        displayName?: string | null;
        name?: string | null;
        nluSettings?: Schema$GoogleCloudDialogflowCxV3beta1NluSettings;
        state?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1VersionVariants {
        variants?: Schema$GoogleCloudDialogflowCxV3beta1VersionVariantsVariant[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1VersionVariantsVariant {
        isControlGroup?: boolean | null;
        trafficAllocation?: number | null;
        version?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1VoiceSelectionParams {
        name?: string | null;
        ssmlGender?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1Webhook {
        disabled?: boolean | null;
        displayName?: string | null;
        genericWebService?: Schema$GoogleCloudDialogflowCxV3beta1WebhookGenericWebService;
        name?: string | null;
        serviceDirectory?: Schema$GoogleCloudDialogflowCxV3beta1WebhookServiceDirectoryConfig;
        timeout?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1WebhookGenericWebService {
        allowedCaCerts?: string[] | null;
        httpMethod?: string | null;
        oauthConfig?: Schema$GoogleCloudDialogflowCxV3beta1WebhookGenericWebServiceOAuthConfig;
        parameterMapping?: {
            [key: string]: string;
        } | null;
        password?: string | null;
        requestBody?: string | null;
        requestHeaders?: {
            [key: string]: string;
        } | null;
        secretVersionForUsernamePassword?: string | null;
        secretVersionsForRequestHeaders?: {
            [key: string]: Schema$GoogleCloudDialogflowCxV3beta1WebhookGenericWebServiceSecretVersionHeaderValue;
        } | null;
        serviceAccountAuthConfig?: Schema$GoogleCloudDialogflowCxV3beta1WebhookGenericWebServiceServiceAccountAuthConfig;
        serviceAgentAuth?: string | null;
        uri?: string | null;
        username?: string | null;
        webhookType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1WebhookGenericWebServiceOAuthConfig {
        clientId?: string | null;
        clientSecret?: string | null;
        scopes?: string[] | null;
        secretVersionForClientSecret?: string | null;
        tokenEndpoint?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1WebhookGenericWebServiceSecretVersionHeaderValue {
        secretVersion?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1WebhookGenericWebServiceServiceAccountAuthConfig {
        serviceAccount?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1WebhookRequest {
        detectIntentResponseId?: string | null;
        dtmfDigits?: string | null;
        fulfillmentInfo?: Schema$GoogleCloudDialogflowCxV3beta1WebhookRequestFulfillmentInfo;
        intentInfo?: Schema$GoogleCloudDialogflowCxV3beta1WebhookRequestIntentInfo;
        languageCode?: string | null;
        languageInfo?: Schema$GoogleCloudDialogflowCxV3beta1LanguageInfo;
        messages?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessage[];
        pageInfo?: Schema$GoogleCloudDialogflowCxV3beta1PageInfo;
        payload?: {
            [key: string]: any;
        } | null;
        sentimentAnalysisResult?: Schema$GoogleCloudDialogflowCxV3beta1WebhookRequestSentimentAnalysisResult;
        sessionInfo?: Schema$GoogleCloudDialogflowCxV3beta1SessionInfo;
        text?: string | null;
        transcript?: string | null;
        triggerEvent?: string | null;
        triggerIntent?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1WebhookRequestFulfillmentInfo {
        tag?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1WebhookRequestIntentInfo {
        confidence?: number | null;
        displayName?: string | null;
        lastMatchedIntent?: string | null;
        parameters?: {
            [key: string]: Schema$GoogleCloudDialogflowCxV3beta1WebhookRequestIntentInfoIntentParameterValue;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1WebhookRequestIntentInfoIntentParameterValue {
        originalValue?: string | null;
        resolvedValue?: any | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1WebhookRequestSentimentAnalysisResult {
        magnitude?: number | null;
        score?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1WebhookResponse {
        fulfillmentResponse?: Schema$GoogleCloudDialogflowCxV3beta1WebhookResponseFulfillmentResponse;
        pageInfo?: Schema$GoogleCloudDialogflowCxV3beta1PageInfo;
        payload?: {
            [key: string]: any;
        } | null;
        sessionInfo?: Schema$GoogleCloudDialogflowCxV3beta1SessionInfo;
        targetFlow?: string | null;
        targetPage?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1WebhookResponseFulfillmentResponse {
        mergeBehavior?: string | null;
        messages?: Schema$GoogleCloudDialogflowCxV3beta1ResponseMessage[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3beta1WebhookServiceDirectoryConfig {
        genericWebService?: Schema$GoogleCloudDialogflowCxV3beta1WebhookGenericWebService;
        service?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ContinuousTestResult {
        name?: string | null;
        result?: string | null;
        runTime?: string | null;
        testCaseResults?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ConversationSignals {
        turnSignals?: Schema$GoogleCloudDialogflowCxV3TurnSignals;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ConversationTurn {
        userInput?: Schema$GoogleCloudDialogflowCxV3ConversationTurnUserInput;
        virtualAgentOutput?: Schema$GoogleCloudDialogflowCxV3ConversationTurnVirtualAgentOutput;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ConversationTurnUserInput {
        enableSentimentAnalysis?: boolean | null;
        injectedParameters?: {
            [key: string]: any;
        } | null;
        input?: Schema$GoogleCloudDialogflowCxV3QueryInput;
        isWebhookEnabled?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ConversationTurnVirtualAgentOutput {
        currentPage?: Schema$GoogleCloudDialogflowCxV3Page;
        diagnosticInfo?: {
            [key: string]: any;
        } | null;
        differences?: Schema$GoogleCloudDialogflowCxV3TestRunDifference[];
        sessionParameters?: {
            [key: string]: any;
        } | null;
        status?: Schema$GoogleRpcStatus;
        textResponses?: Schema$GoogleCloudDialogflowCxV3ResponseMessageText[];
        triggeredIntent?: Schema$GoogleCloudDialogflowCxV3Intent;
    }
    export interface Schema$GoogleCloudDialogflowCxV3CreateVersionOperationMetadata {
        version?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3DataStoreConnection {
        dataStore?: string | null;
        dataStoreType?: string | null;
        documentProcessingMode?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3DeployFlowMetadata {
        testErrors?: Schema$GoogleCloudDialogflowCxV3TestError[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3DeployFlowResponse {
        deployment?: string | null;
        environment?: Schema$GoogleCloudDialogflowCxV3Environment;
    }
    export interface Schema$GoogleCloudDialogflowCxV3DtmfInput {
        digits?: string | null;
        finishDigit?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3Environment {
        description?: string | null;
        displayName?: string | null;
        name?: string | null;
        testCasesConfig?: Schema$GoogleCloudDialogflowCxV3EnvironmentTestCasesConfig;
        updateTime?: string | null;
        versionConfigs?: Schema$GoogleCloudDialogflowCxV3EnvironmentVersionConfig[];
        webhookConfig?: Schema$GoogleCloudDialogflowCxV3EnvironmentWebhookConfig;
    }
    export interface Schema$GoogleCloudDialogflowCxV3EnvironmentTestCasesConfig {
        enableContinuousRun?: boolean | null;
        enablePredeploymentRun?: boolean | null;
        testCases?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3EnvironmentVersionConfig {
        version?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3EnvironmentWebhookConfig {
        webhookOverrides?: Schema$GoogleCloudDialogflowCxV3Webhook[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3EventHandler {
        event?: string | null;
        name?: string | null;
        targetFlow?: string | null;
        targetPage?: string | null;
        targetPlaybook?: string | null;
        triggerFulfillment?: Schema$GoogleCloudDialogflowCxV3Fulfillment;
    }
    export interface Schema$GoogleCloudDialogflowCxV3EventInput {
        event?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ExportAgentResponse {
        agentContent?: string | null;
        agentUri?: string | null;
        commitSha?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ExportEntityTypesMetadata {
    }
    export interface Schema$GoogleCloudDialogflowCxV3ExportEntityTypesResponse {
        entityTypesContent?: Schema$GoogleCloudDialogflowCxV3InlineDestination;
        entityTypesUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ExportFlowResponse {
        flowContent?: string | null;
        flowUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ExportIntentsMetadata {
    }
    export interface Schema$GoogleCloudDialogflowCxV3ExportIntentsResponse {
        intentsContent?: Schema$GoogleCloudDialogflowCxV3InlineDestination;
        intentsUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ExportTestCasesMetadata {
    }
    export interface Schema$GoogleCloudDialogflowCxV3ExportTestCasesResponse {
        content?: string | null;
        gcsUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3Form {
        parameters?: Schema$GoogleCloudDialogflowCxV3FormParameter[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3FormParameter {
        advancedSettings?: Schema$GoogleCloudDialogflowCxV3AdvancedSettings;
        defaultValue?: any | null;
        displayName?: string | null;
        entityType?: string | null;
        fillBehavior?: Schema$GoogleCloudDialogflowCxV3FormParameterFillBehavior;
        isList?: boolean | null;
        redact?: boolean | null;
        required?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3FormParameterFillBehavior {
        initialPromptFulfillment?: Schema$GoogleCloudDialogflowCxV3Fulfillment;
        repromptEventHandlers?: Schema$GoogleCloudDialogflowCxV3EventHandler[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3Fulfillment {
        advancedSettings?: Schema$GoogleCloudDialogflowCxV3AdvancedSettings;
        conditionalCases?: Schema$GoogleCloudDialogflowCxV3FulfillmentConditionalCases[];
        enableGenerativeFallback?: boolean | null;
        generators?: Schema$GoogleCloudDialogflowCxV3FulfillmentGeneratorSettings[];
        messages?: Schema$GoogleCloudDialogflowCxV3ResponseMessage[];
        returnPartialResponses?: boolean | null;
        setParameterActions?: Schema$GoogleCloudDialogflowCxV3FulfillmentSetParameterAction[];
        tag?: string | null;
        webhook?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3FulfillmentConditionalCases {
        cases?: Schema$GoogleCloudDialogflowCxV3FulfillmentConditionalCasesCase[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3FulfillmentConditionalCasesCase {
        caseContent?: Schema$GoogleCloudDialogflowCxV3FulfillmentConditionalCasesCaseCaseContent[];
        condition?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3FulfillmentConditionalCasesCaseCaseContent {
        additionalCases?: Schema$GoogleCloudDialogflowCxV3FulfillmentConditionalCases;
        message?: Schema$GoogleCloudDialogflowCxV3ResponseMessage;
    }
    export interface Schema$GoogleCloudDialogflowCxV3FulfillmentGeneratorSettings {
        generator?: string | null;
        inputParameters?: {
            [key: string]: string;
        } | null;
        outputParameter?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3FulfillmentSetParameterAction {
        parameter?: string | null;
        value?: any | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3GcsDestination {
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ImportEntityTypesMetadata {
    }
    export interface Schema$GoogleCloudDialogflowCxV3ImportEntityTypesResponse {
        conflictingResources?: Schema$GoogleCloudDialogflowCxV3ImportEntityTypesResponseConflictingResources;
        entityTypes?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ImportEntityTypesResponseConflictingResources {
        entityDisplayNames?: string[] | null;
        entityTypeDisplayNames?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ImportFlowResponse {
        flow?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ImportIntentsMetadata {
    }
    export interface Schema$GoogleCloudDialogflowCxV3ImportIntentsResponse {
        conflictingResources?: Schema$GoogleCloudDialogflowCxV3ImportIntentsResponseConflictingResources;
        intents?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ImportIntentsResponseConflictingResources {
        entityDisplayNames?: string[] | null;
        intentDisplayNames?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ImportTestCasesMetadata {
        errors?: Schema$GoogleCloudDialogflowCxV3TestCaseError[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3ImportTestCasesResponse {
        names?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3InlineDestination {
        content?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3InputAudioConfig {
        audioEncoding?: string | null;
        bargeInConfig?: Schema$GoogleCloudDialogflowCxV3BargeInConfig;
        enableWordInfo?: boolean | null;
        model?: string | null;
        modelVariant?: string | null;
        optOutConformerModelMigration?: boolean | null;
        phraseHints?: string[] | null;
        sampleRateHertz?: number | null;
        singleUtterance?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3Intent {
        description?: string | null;
        displayName?: string | null;
        dtmfPattern?: string | null;
        isFallback?: boolean | null;
        labels?: {
            [key: string]: string;
        } | null;
        name?: string | null;
        parameters?: Schema$GoogleCloudDialogflowCxV3IntentParameter[];
        priority?: number | null;
        trainingPhrases?: Schema$GoogleCloudDialogflowCxV3IntentTrainingPhrase[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3IntentInput {
        intent?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3IntentParameter {
        entityType?: string | null;
        id?: string | null;
        isList?: boolean | null;
        redact?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3IntentTrainingPhrase {
        id?: string | null;
        parts?: Schema$GoogleCloudDialogflowCxV3IntentTrainingPhrasePart[];
        repeatCount?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3IntentTrainingPhrasePart {
        parameterId?: string | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3KnowledgeConnectorSettings {
        dataStoreConnections?: Schema$GoogleCloudDialogflowCxV3DataStoreConnection[];
        enabled?: boolean | null;
        targetFlow?: string | null;
        targetPage?: string | null;
        triggerFulfillment?: Schema$GoogleCloudDialogflowCxV3Fulfillment;
    }
    export interface Schema$GoogleCloudDialogflowCxV3LanguageInfo {
        confidenceScore?: number | null;
        inputLanguageCode?: string | null;
        resolvedLanguageCode?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3Page {
        advancedSettings?: Schema$GoogleCloudDialogflowCxV3AdvancedSettings;
        description?: string | null;
        displayName?: string | null;
        entryFulfillment?: Schema$GoogleCloudDialogflowCxV3Fulfillment;
        eventHandlers?: Schema$GoogleCloudDialogflowCxV3EventHandler[];
        form?: Schema$GoogleCloudDialogflowCxV3Form;
        knowledgeConnectorSettings?: Schema$GoogleCloudDialogflowCxV3KnowledgeConnectorSettings;
        name?: string | null;
        transitionRouteGroups?: string[] | null;
        transitionRoutes?: Schema$GoogleCloudDialogflowCxV3TransitionRoute[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3PageInfo {
        currentPage?: string | null;
        displayName?: string | null;
        formInfo?: Schema$GoogleCloudDialogflowCxV3PageInfoFormInfo;
    }
    export interface Schema$GoogleCloudDialogflowCxV3PageInfoFormInfo {
        parameterInfo?: Schema$GoogleCloudDialogflowCxV3PageInfoFormInfoParameterInfo[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3PageInfoFormInfoParameterInfo {
        displayName?: string | null;
        justCollected?: boolean | null;
        required?: boolean | null;
        state?: string | null;
        value?: any | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3QueryInput {
        audio?: Schema$GoogleCloudDialogflowCxV3AudioInput;
        dtmf?: Schema$GoogleCloudDialogflowCxV3DtmfInput;
        event?: Schema$GoogleCloudDialogflowCxV3EventInput;
        intent?: Schema$GoogleCloudDialogflowCxV3IntentInput;
        languageCode?: string | null;
        text?: Schema$GoogleCloudDialogflowCxV3TextInput;
        toolCallResult?: Schema$GoogleCloudDialogflowCxV3ToolCallResult;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ResponseMessage {
        channel?: string | null;
        conversationSuccess?: Schema$GoogleCloudDialogflowCxV3ResponseMessageConversationSuccess;
        endInteraction?: Schema$GoogleCloudDialogflowCxV3ResponseMessageEndInteraction;
        knowledgeInfoCard?: Schema$GoogleCloudDialogflowCxV3ResponseMessageKnowledgeInfoCard;
        liveAgentHandoff?: Schema$GoogleCloudDialogflowCxV3ResponseMessageLiveAgentHandoff;
        mixedAudio?: Schema$GoogleCloudDialogflowCxV3ResponseMessageMixedAudio;
        outputAudioText?: Schema$GoogleCloudDialogflowCxV3ResponseMessageOutputAudioText;
        payload?: {
            [key: string]: any;
        } | null;
        playAudio?: Schema$GoogleCloudDialogflowCxV3ResponseMessagePlayAudio;
        responseType?: string | null;
        telephonyTransferCall?: Schema$GoogleCloudDialogflowCxV3ResponseMessageTelephonyTransferCall;
        text?: Schema$GoogleCloudDialogflowCxV3ResponseMessageText;
        toolCall?: Schema$GoogleCloudDialogflowCxV3ToolCall;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ResponseMessageConversationSuccess {
        metadata?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ResponseMessageEndInteraction {
    }
    export interface Schema$GoogleCloudDialogflowCxV3ResponseMessageKnowledgeInfoCard {
    }
    export interface Schema$GoogleCloudDialogflowCxV3ResponseMessageLiveAgentHandoff {
        metadata?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ResponseMessageMixedAudio {
        segments?: Schema$GoogleCloudDialogflowCxV3ResponseMessageMixedAudioSegment[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3ResponseMessageMixedAudioSegment {
        allowPlaybackInterruption?: boolean | null;
        audio?: string | null;
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ResponseMessageOutputAudioText {
        allowPlaybackInterruption?: boolean | null;
        ssml?: string | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ResponseMessagePlayAudio {
        allowPlaybackInterruption?: boolean | null;
        audioUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ResponseMessageTelephonyTransferCall {
        phoneNumber?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ResponseMessageText {
        allowPlaybackInterruption?: boolean | null;
        text?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3RunContinuousTestMetadata {
        errors?: Schema$GoogleCloudDialogflowCxV3TestError[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3RunContinuousTestResponse {
        continuousTestResult?: Schema$GoogleCloudDialogflowCxV3ContinuousTestResult;
    }
    export interface Schema$GoogleCloudDialogflowCxV3RunTestCaseMetadata {
    }
    export interface Schema$GoogleCloudDialogflowCxV3RunTestCaseResponse {
        result?: Schema$GoogleCloudDialogflowCxV3TestCaseResult;
    }
    export interface Schema$GoogleCloudDialogflowCxV3SessionInfo {
        parameters?: {
            [key: string]: any;
        } | null;
        session?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3TestCase {
        creationTime?: string | null;
        displayName?: string | null;
        lastTestResult?: Schema$GoogleCloudDialogflowCxV3TestCaseResult;
        name?: string | null;
        notes?: string | null;
        tags?: string[] | null;
        testCaseConversationTurns?: Schema$GoogleCloudDialogflowCxV3ConversationTurn[];
        testConfig?: Schema$GoogleCloudDialogflowCxV3TestConfig;
    }
    export interface Schema$GoogleCloudDialogflowCxV3TestCaseError {
        status?: Schema$GoogleRpcStatus;
        testCase?: Schema$GoogleCloudDialogflowCxV3TestCase;
    }
    export interface Schema$GoogleCloudDialogflowCxV3TestCaseResult {
        conversationTurns?: Schema$GoogleCloudDialogflowCxV3ConversationTurn[];
        environment?: string | null;
        name?: string | null;
        testResult?: string | null;
        testTime?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3TestConfig {
        flow?: string | null;
        page?: string | null;
        trackingParameters?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3TestError {
        status?: Schema$GoogleRpcStatus;
        testCase?: string | null;
        testTime?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3TestRunDifference {
        description?: string | null;
        type?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3TextInput {
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ToolCall {
        action?: string | null;
        inputParameters?: {
            [key: string]: any;
        } | null;
        tool?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ToolCallResult {
        action?: string | null;
        error?: Schema$GoogleCloudDialogflowCxV3ToolCallResultError;
        outputParameters?: {
            [key: string]: any;
        } | null;
        tool?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3ToolCallResultError {
        message?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3TransitionRoute {
        condition?: string | null;
        description?: string | null;
        intent?: string | null;
        name?: string | null;
        targetFlow?: string | null;
        targetPage?: string | null;
        triggerFulfillment?: Schema$GoogleCloudDialogflowCxV3Fulfillment;
    }
    export interface Schema$GoogleCloudDialogflowCxV3TurnSignals {
        agentEscalated?: boolean | null;
        dtmfUsed?: boolean | null;
        failureReasons?: string[] | null;
        noMatch?: boolean | null;
        noUserInput?: boolean | null;
        reachedEndPage?: boolean | null;
        sentimentMagnitude?: number | null;
        sentimentScore?: number | null;
        userEscalated?: boolean | null;
        webhookStatuses?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3Webhook {
        disabled?: boolean | null;
        displayName?: string | null;
        genericWebService?: Schema$GoogleCloudDialogflowCxV3WebhookGenericWebService;
        name?: string | null;
        serviceDirectory?: Schema$GoogleCloudDialogflowCxV3WebhookServiceDirectoryConfig;
        timeout?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3WebhookGenericWebService {
        allowedCaCerts?: string[] | null;
        httpMethod?: string | null;
        oauthConfig?: Schema$GoogleCloudDialogflowCxV3WebhookGenericWebServiceOAuthConfig;
        parameterMapping?: {
            [key: string]: string;
        } | null;
        password?: string | null;
        requestBody?: string | null;
        requestHeaders?: {
            [key: string]: string;
        } | null;
        secretVersionForUsernamePassword?: string | null;
        secretVersionsForRequestHeaders?: {
            [key: string]: Schema$GoogleCloudDialogflowCxV3WebhookGenericWebServiceSecretVersionHeaderValue;
        } | null;
        serviceAccountAuthConfig?: Schema$GoogleCloudDialogflowCxV3WebhookGenericWebServiceServiceAccountAuthConfig;
        serviceAgentAuth?: string | null;
        uri?: string | null;
        username?: string | null;
        webhookType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3WebhookGenericWebServiceOAuthConfig {
        clientId?: string | null;
        clientSecret?: string | null;
        scopes?: string[] | null;
        secretVersionForClientSecret?: string | null;
        tokenEndpoint?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3WebhookGenericWebServiceSecretVersionHeaderValue {
        secretVersion?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3WebhookGenericWebServiceServiceAccountAuthConfig {
        serviceAccount?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3WebhookRequest {
        detectIntentResponseId?: string | null;
        dtmfDigits?: string | null;
        fulfillmentInfo?: Schema$GoogleCloudDialogflowCxV3WebhookRequestFulfillmentInfo;
        intentInfo?: Schema$GoogleCloudDialogflowCxV3WebhookRequestIntentInfo;
        languageCode?: string | null;
        languageInfo?: Schema$GoogleCloudDialogflowCxV3LanguageInfo;
        messages?: Schema$GoogleCloudDialogflowCxV3ResponseMessage[];
        pageInfo?: Schema$GoogleCloudDialogflowCxV3PageInfo;
        payload?: {
            [key: string]: any;
        } | null;
        sentimentAnalysisResult?: Schema$GoogleCloudDialogflowCxV3WebhookRequestSentimentAnalysisResult;
        sessionInfo?: Schema$GoogleCloudDialogflowCxV3SessionInfo;
        text?: string | null;
        transcript?: string | null;
        triggerEvent?: string | null;
        triggerIntent?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3WebhookRequestFulfillmentInfo {
        tag?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3WebhookRequestIntentInfo {
        confidence?: number | null;
        displayName?: string | null;
        lastMatchedIntent?: string | null;
        parameters?: {
            [key: string]: Schema$GoogleCloudDialogflowCxV3WebhookRequestIntentInfoIntentParameterValue;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3WebhookRequestIntentInfoIntentParameterValue {
        originalValue?: string | null;
        resolvedValue?: any | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3WebhookRequestSentimentAnalysisResult {
        magnitude?: number | null;
        score?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3WebhookResponse {
        fulfillmentResponse?: Schema$GoogleCloudDialogflowCxV3WebhookResponseFulfillmentResponse;
        pageInfo?: Schema$GoogleCloudDialogflowCxV3PageInfo;
        payload?: {
            [key: string]: any;
        } | null;
        sessionInfo?: Schema$GoogleCloudDialogflowCxV3SessionInfo;
        targetFlow?: string | null;
        targetPage?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowCxV3WebhookResponseFulfillmentResponse {
        mergeBehavior?: string | null;
        messages?: Schema$GoogleCloudDialogflowCxV3ResponseMessage[];
    }
    export interface Schema$GoogleCloudDialogflowCxV3WebhookServiceDirectoryConfig {
        genericWebService?: Schema$GoogleCloudDialogflowCxV3WebhookGenericWebService;
        service?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2AgentCoachingInstruction {
        agentAction?: string | null;
        condition?: string | null;
        displayDetails?: string | null;
        displayName?: string | null;
        duplicateCheckResult?: Schema$GoogleCloudDialogflowV2AgentCoachingInstructionDuplicateCheckResult;
        systemAction?: string | null;
        triggeringEvent?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2AgentCoachingInstructionDuplicateCheckResult {
        duplicateSuggestions?: Schema$GoogleCloudDialogflowV2AgentCoachingInstructionDuplicateCheckResultDuplicateSuggestion[];
    }
    export interface Schema$GoogleCloudDialogflowV2AgentCoachingInstructionDuplicateCheckResultDuplicateSuggestion {
        answerRecord?: string | null;
        similarityScore?: number | null;
        suggestionIndex?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowV2AgentCoachingSuggestion {
        agentActionSuggestions?: Schema$GoogleCloudDialogflowV2AgentCoachingSuggestionAgentActionSuggestion[];
        applicableInstructions?: Schema$GoogleCloudDialogflowV2AgentCoachingInstruction[];
        sampleResponses?: Schema$GoogleCloudDialogflowV2AgentCoachingSuggestionSampleResponse[];
    }
    export interface Schema$GoogleCloudDialogflowV2AgentCoachingSuggestionAgentActionSuggestion {
        agentAction?: string | null;
        duplicateCheckResult?: Schema$GoogleCloudDialogflowV2AgentCoachingSuggestionDuplicateCheckResult;
        sources?: Schema$GoogleCloudDialogflowV2AgentCoachingSuggestionSources;
    }
    export interface Schema$GoogleCloudDialogflowV2AgentCoachingSuggestionDuplicateCheckResult {
        duplicateSuggestions?: Schema$GoogleCloudDialogflowV2AgentCoachingSuggestionDuplicateCheckResultDuplicateSuggestion[];
    }
    export interface Schema$GoogleCloudDialogflowV2AgentCoachingSuggestionDuplicateCheckResultDuplicateSuggestion {
        answerRecord?: string | null;
        similarityScore?: number | null;
        sources?: Schema$GoogleCloudDialogflowV2AgentCoachingSuggestionSources;
        suggestionIndex?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowV2AgentCoachingSuggestionSampleResponse {
        duplicateCheckResult?: Schema$GoogleCloudDialogflowV2AgentCoachingSuggestionDuplicateCheckResult;
        responseText?: string | null;
        sources?: Schema$GoogleCloudDialogflowV2AgentCoachingSuggestionSources;
    }
    export interface Schema$GoogleCloudDialogflowV2AgentCoachingSuggestionSources {
        instructionIndexes?: number[] | null;
    }
    export interface Schema$GoogleCloudDialogflowV2AnnotatedMessagePart {
        entityType?: string | null;
        formattedValue?: any | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2ArticleAnswer {
        answerRecord?: string | null;
        confidence?: number | null;
        metadata?: {
            [key: string]: string;
        } | null;
        snippets?: string[] | null;
        title?: string | null;
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2ArticleSuggestionModelMetadata {
        trainingModelType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2BatchUpdateEntityTypesResponse {
        entityTypes?: Schema$GoogleCloudDialogflowV2EntityType[];
    }
    export interface Schema$GoogleCloudDialogflowV2BatchUpdateIntentsResponse {
        intents?: Schema$GoogleCloudDialogflowV2Intent[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1AgentCoachingInstruction {
        agentAction?: string | null;
        condition?: string | null;
        displayDetails?: string | null;
        displayName?: string | null;
        duplicateCheckResult?: Schema$GoogleCloudDialogflowV2beta1AgentCoachingInstructionDuplicateCheckResult;
        systemAction?: string | null;
        triggeringEvent?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1AgentCoachingInstructionDuplicateCheckResult {
        duplicateSuggestions?: Schema$GoogleCloudDialogflowV2beta1AgentCoachingInstructionDuplicateCheckResultDuplicateSuggestion[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1AgentCoachingInstructionDuplicateCheckResultDuplicateSuggestion {
        answerRecord?: string | null;
        similarityScore?: number | null;
        suggestionIndex?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestion {
        agentActionSuggestions?: Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestionAgentActionSuggestion[];
        applicableInstructions?: Schema$GoogleCloudDialogflowV2beta1AgentCoachingInstruction[];
        sampleResponses?: Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestionSampleResponse[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestionAgentActionSuggestion {
        agentAction?: string | null;
        duplicateCheckResult?: Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestionDuplicateCheckResult;
        sources?: Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestionSources;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestionDuplicateCheckResult {
        duplicateSuggestions?: Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestionDuplicateCheckResultDuplicateSuggestion[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestionDuplicateCheckResultDuplicateSuggestion {
        answerRecord?: string | null;
        similarityScore?: number | null;
        sources?: Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestionSources;
        suggestionIndex?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestionSampleResponse {
        duplicateCheckResult?: Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestionDuplicateCheckResult;
        responseText?: string | null;
        sources?: Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestionSources;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestionSources {
        instructionIndexes?: number[] | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1AnnotatedMessagePart {
        entityType?: string | null;
        formattedValue?: any | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ArticleAnswer {
        answerRecord?: string | null;
        metadata?: {
            [key: string]: string;
        } | null;
        snippets?: string[] | null;
        title?: string | null;
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1BatchUpdateEntityTypesResponse {
        entityTypes?: Schema$GoogleCloudDialogflowV2beta1EntityType[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1BatchUpdateIntentsResponse {
        intents?: Schema$GoogleCloudDialogflowV2beta1Intent[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ClearSuggestionFeatureConfigOperationMetadata {
        conversationProfile?: string | null;
        createTime?: string | null;
        participantRole?: string | null;
        suggestionFeatureType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1Context {
        lifespanCount?: number | null;
        name?: string | null;
        parameters?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ConversationEvent {
        conversation?: string | null;
        errorStatus?: Schema$GoogleRpcStatus;
        newMessagePayload?: Schema$GoogleCloudDialogflowV2beta1Message;
        newRecognitionResultPayload?: Schema$GoogleCloudDialogflowV2beta1StreamingRecognitionResult;
        type?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1DialogflowAssistAnswer {
        answerRecord?: string | null;
        intentSuggestion?: Schema$GoogleCloudDialogflowV2beta1IntentSuggestion;
        queryResult?: Schema$GoogleCloudDialogflowV2beta1QueryResult;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1EncryptionSpec {
        kmsKey?: string | null;
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1EntityType {
        autoExpansionMode?: string | null;
        displayName?: string | null;
        enableFuzzyExtraction?: boolean | null;
        entities?: Schema$GoogleCloudDialogflowV2beta1EntityTypeEntity[];
        kind?: string | null;
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1EntityTypeEntity {
        synonyms?: string[] | null;
        value?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1EventInput {
        languageCode?: string | null;
        name?: string | null;
        parameters?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ExportAgentResponse {
        agentContent?: string | null;
        agentUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ExportOperationMetadata {
        exportedGcsDestination?: Schema$GoogleCloudDialogflowV2beta1GcsDestination;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1FaqAnswer {
        answer?: string | null;
        answerRecord?: string | null;
        confidence?: number | null;
        metadata?: {
            [key: string]: string;
        } | null;
        question?: string | null;
        source?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1FreeFormSuggestion {
        response?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1GcsDestination {
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1GenerateSuggestionsResponse {
        generatorSuggestionAnswers?: Schema$GoogleCloudDialogflowV2beta1GenerateSuggestionsResponseGeneratorSuggestionAnswer[];
        latestMessage?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1GenerateSuggestionsResponseGeneratorSuggestionAnswer {
        answerRecord?: string | null;
        generatorSuggestion?: Schema$GoogleCloudDialogflowV2beta1GeneratorSuggestion;
        sourceGenerator?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1GeneratorSuggestion {
        agentCoachingSuggestion?: Schema$GoogleCloudDialogflowV2beta1AgentCoachingSuggestion;
        freeFormSuggestion?: Schema$GoogleCloudDialogflowV2beta1FreeFormSuggestion;
        summarySuggestion?: Schema$GoogleCloudDialogflowV2beta1SummarySuggestion;
        toolCallInfo?: Schema$GoogleCloudDialogflowV2beta1GeneratorSuggestionToolCallInfo[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1GeneratorSuggestionToolCallInfo {
        toolCall?: Schema$GoogleCloudDialogflowV2beta1ToolCall;
        toolCallResult?: Schema$GoogleCloudDialogflowV2beta1ToolCallResult;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1HumanAgentAssistantEvent {
        conversation?: string | null;
        participant?: string | null;
        suggestionResults?: Schema$GoogleCloudDialogflowV2beta1SuggestionResult[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ImportDocumentsResponse {
        warnings?: Schema$GoogleRpcStatus[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IngestedContextReferenceDebugInfo {
        contextReferenceRetrieved?: boolean | null;
        ingestedParametersDebugInfo?: Schema$GoogleCloudDialogflowV2beta1IngestedContextReferenceDebugInfoIngestedParameterDebugInfo[];
        projectNotAllowlisted?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IngestedContextReferenceDebugInfoIngestedParameterDebugInfo {
        ingestionStatus?: string | null;
        parameter?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1InitializeEncryptionSpecMetadata {
        request?: Schema$GoogleCloudDialogflowV2beta1InitializeEncryptionSpecRequest;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1InitializeEncryptionSpecRequest {
        encryptionSpec?: Schema$GoogleCloudDialogflowV2beta1EncryptionSpec;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1Intent {
        action?: string | null;
        defaultResponsePlatforms?: string[] | null;
        displayName?: string | null;
        endInteraction?: boolean | null;
        events?: string[] | null;
        followupIntentInfo?: Schema$GoogleCloudDialogflowV2beta1IntentFollowupIntentInfo[];
        inputContextNames?: string[] | null;
        isFallback?: boolean | null;
        liveAgentHandoff?: boolean | null;
        messages?: Schema$GoogleCloudDialogflowV2beta1IntentMessage[];
        mlDisabled?: boolean | null;
        mlEnabled?: boolean | null;
        name?: string | null;
        outputContexts?: Schema$GoogleCloudDialogflowV2beta1Context[];
        parameters?: Schema$GoogleCloudDialogflowV2beta1IntentParameter[];
        parentFollowupIntentName?: string | null;
        priority?: number | null;
        resetContexts?: boolean | null;
        rootFollowupIntentName?: string | null;
        trainingPhrases?: Schema$GoogleCloudDialogflowV2beta1IntentTrainingPhrase[];
        webhookState?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentFollowupIntentInfo {
        followupIntentName?: string | null;
        parentFollowupIntentName?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessage {
        basicCard?: Schema$GoogleCloudDialogflowV2beta1IntentMessageBasicCard;
        browseCarouselCard?: Schema$GoogleCloudDialogflowV2beta1IntentMessageBrowseCarouselCard;
        card?: Schema$GoogleCloudDialogflowV2beta1IntentMessageCard;
        carouselSelect?: Schema$GoogleCloudDialogflowV2beta1IntentMessageCarouselSelect;
        image?: Schema$GoogleCloudDialogflowV2beta1IntentMessageImage;
        linkOutSuggestion?: Schema$GoogleCloudDialogflowV2beta1IntentMessageLinkOutSuggestion;
        listSelect?: Schema$GoogleCloudDialogflowV2beta1IntentMessageListSelect;
        mediaContent?: Schema$GoogleCloudDialogflowV2beta1IntentMessageMediaContent;
        payload?: {
            [key: string]: any;
        } | null;
        platform?: string | null;
        quickReplies?: Schema$GoogleCloudDialogflowV2beta1IntentMessageQuickReplies;
        rbmCarouselRichCard?: Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmCarouselCard;
        rbmStandaloneRichCard?: Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmStandaloneCard;
        rbmText?: Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmText;
        simpleResponses?: Schema$GoogleCloudDialogflowV2beta1IntentMessageSimpleResponses;
        suggestions?: Schema$GoogleCloudDialogflowV2beta1IntentMessageSuggestions;
        tableCard?: Schema$GoogleCloudDialogflowV2beta1IntentMessageTableCard;
        telephonyPlayAudio?: Schema$GoogleCloudDialogflowV2beta1IntentMessageTelephonyPlayAudio;
        telephonySynthesizeSpeech?: Schema$GoogleCloudDialogflowV2beta1IntentMessageTelephonySynthesizeSpeech;
        telephonyTransferCall?: Schema$GoogleCloudDialogflowV2beta1IntentMessageTelephonyTransferCall;
        text?: Schema$GoogleCloudDialogflowV2beta1IntentMessageText;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageBasicCard {
        buttons?: Schema$GoogleCloudDialogflowV2beta1IntentMessageBasicCardButton[];
        formattedText?: string | null;
        image?: Schema$GoogleCloudDialogflowV2beta1IntentMessageImage;
        subtitle?: string | null;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageBasicCardButton {
        openUriAction?: Schema$GoogleCloudDialogflowV2beta1IntentMessageBasicCardButtonOpenUriAction;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageBasicCardButtonOpenUriAction {
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageBrowseCarouselCard {
        imageDisplayOptions?: string | null;
        items?: Schema$GoogleCloudDialogflowV2beta1IntentMessageBrowseCarouselCardBrowseCarouselCardItem[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageBrowseCarouselCardBrowseCarouselCardItem {
        description?: string | null;
        footer?: string | null;
        image?: Schema$GoogleCloudDialogflowV2beta1IntentMessageImage;
        openUriAction?: Schema$GoogleCloudDialogflowV2beta1IntentMessageBrowseCarouselCardBrowseCarouselCardItemOpenUrlAction;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageBrowseCarouselCardBrowseCarouselCardItemOpenUrlAction {
        url?: string | null;
        urlTypeHint?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageCard {
        buttons?: Schema$GoogleCloudDialogflowV2beta1IntentMessageCardButton[];
        imageUri?: string | null;
        subtitle?: string | null;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageCardButton {
        postback?: string | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageCarouselSelect {
        items?: Schema$GoogleCloudDialogflowV2beta1IntentMessageCarouselSelectItem[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageCarouselSelectItem {
        description?: string | null;
        image?: Schema$GoogleCloudDialogflowV2beta1IntentMessageImage;
        info?: Schema$GoogleCloudDialogflowV2beta1IntentMessageSelectItemInfo;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageColumnProperties {
        header?: string | null;
        horizontalAlignment?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageImage {
        accessibilityText?: string | null;
        imageUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageLinkOutSuggestion {
        destinationName?: string | null;
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageListSelect {
        items?: Schema$GoogleCloudDialogflowV2beta1IntentMessageListSelectItem[];
        subtitle?: string | null;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageListSelectItem {
        description?: string | null;
        image?: Schema$GoogleCloudDialogflowV2beta1IntentMessageImage;
        info?: Schema$GoogleCloudDialogflowV2beta1IntentMessageSelectItemInfo;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageMediaContent {
        mediaObjects?: Schema$GoogleCloudDialogflowV2beta1IntentMessageMediaContentResponseMediaObject[];
        mediaType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageMediaContentResponseMediaObject {
        contentUrl?: string | null;
        description?: string | null;
        icon?: Schema$GoogleCloudDialogflowV2beta1IntentMessageImage;
        largeImage?: Schema$GoogleCloudDialogflowV2beta1IntentMessageImage;
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageQuickReplies {
        quickReplies?: string[] | null;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmCardContent {
        description?: string | null;
        media?: Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmCardContentRbmMedia;
        suggestions?: Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmSuggestion[];
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmCardContentRbmMedia {
        fileUri?: string | null;
        height?: string | null;
        thumbnailUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmCarouselCard {
        cardContents?: Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmCardContent[];
        cardWidth?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmStandaloneCard {
        cardContent?: Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmCardContent;
        cardOrientation?: string | null;
        thumbnailImageAlignment?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmSuggestedAction {
        dial?: Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmSuggestedActionRbmSuggestedActionDial;
        openUrl?: Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmSuggestedActionRbmSuggestedActionOpenUri;
        postbackData?: string | null;
        shareLocation?: Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmSuggestedActionRbmSuggestedActionShareLocation;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmSuggestedActionRbmSuggestedActionDial {
        phoneNumber?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmSuggestedActionRbmSuggestedActionOpenUri {
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmSuggestedActionRbmSuggestedActionShareLocation {
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmSuggestedReply {
        postbackData?: string | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmSuggestion {
        action?: Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmSuggestedAction;
        reply?: Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmSuggestedReply;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmText {
        rbmSuggestion?: Schema$GoogleCloudDialogflowV2beta1IntentMessageRbmSuggestion[];
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageSelectItemInfo {
        key?: string | null;
        synonyms?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageSimpleResponse {
        displayText?: string | null;
        ssml?: string | null;
        textToSpeech?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageSimpleResponses {
        simpleResponses?: Schema$GoogleCloudDialogflowV2beta1IntentMessageSimpleResponse[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageSuggestion {
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageSuggestions {
        suggestions?: Schema$GoogleCloudDialogflowV2beta1IntentMessageSuggestion[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageTableCard {
        buttons?: Schema$GoogleCloudDialogflowV2beta1IntentMessageBasicCardButton[];
        columnProperties?: Schema$GoogleCloudDialogflowV2beta1IntentMessageColumnProperties[];
        image?: Schema$GoogleCloudDialogflowV2beta1IntentMessageImage;
        rows?: Schema$GoogleCloudDialogflowV2beta1IntentMessageTableCardRow[];
        subtitle?: string | null;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageTableCardCell {
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageTableCardRow {
        cells?: Schema$GoogleCloudDialogflowV2beta1IntentMessageTableCardCell[];
        dividerAfter?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageTelephonyPlayAudio {
        audioUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageTelephonySynthesizeSpeech {
        ssml?: string | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageTelephonyTransferCall {
        phoneNumber?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentMessageText {
        text?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentParameter {
        defaultValue?: string | null;
        displayName?: string | null;
        entityTypeDisplayName?: string | null;
        isList?: boolean | null;
        mandatory?: boolean | null;
        name?: string | null;
        prompts?: string[] | null;
        value?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentSuggestion {
        description?: string | null;
        displayName?: string | null;
        intentV2?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentTrainingPhrase {
        name?: string | null;
        parts?: Schema$GoogleCloudDialogflowV2beta1IntentTrainingPhrasePart[];
        timesAddedCount?: number | null;
        type?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1IntentTrainingPhrasePart {
        alias?: string | null;
        entityType?: string | null;
        text?: string | null;
        userDefined?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1KnowledgeAnswers {
        answers?: Schema$GoogleCloudDialogflowV2beta1KnowledgeAnswersAnswer[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1KnowledgeAnswersAnswer {
        answer?: string | null;
        faqQuestion?: string | null;
        matchConfidence?: number | null;
        matchConfidenceLevel?: string | null;
        source?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswer {
        answerRecord?: string | null;
        knowledgeAssistDebugInfo?: Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistDebugInfo;
        suggestedQuery?: Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswerSuggestedQuery;
        suggestedQueryAnswer?: Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswerKnowledgeAnswer;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswerKnowledgeAnswer {
        answerText?: string | null;
        eventSource?: Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswerKnowledgeAnswerEventSource;
        faqSource?: Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswerKnowledgeAnswerFaqSource;
        generativeSource?: Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswerKnowledgeAnswerGenerativeSource;
        playbookSource?: Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswerKnowledgeAnswerGenerativeSource;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswerKnowledgeAnswerEventSource {
        event?: string | null;
        snippets?: Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswerKnowledgeAnswerGenerativeSource;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswerKnowledgeAnswerFaqSource {
        question?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswerKnowledgeAnswerGenerativeSource {
        snippets?: Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswerKnowledgeAnswerGenerativeSourceSnippet[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswerKnowledgeAnswerGenerativeSourceSnippet {
        metadata?: {
            [key: string]: any;
        } | null;
        text?: string | null;
        title?: string | null;
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswerSuggestedQuery {
        queryText?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistDebugInfo {
        cesDebugInfo?: {
            [key: string]: any;
        } | null;
        datastoreResponseReason?: string | null;
        ingestedContextReferenceDebugInfo?: Schema$GoogleCloudDialogflowV2beta1IngestedContextReferenceDebugInfo;
        knowledgeAssistBehavior?: Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistDebugInfoKnowledgeAssistBehavior;
        queryCategorizationFailureReason?: string | null;
        queryGenerationDebugInfo?: Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistDebugInfoQueryGenerationDebugInfo;
        queryGenerationFailureReason?: string | null;
        serviceLatency?: Schema$GoogleCloudDialogflowV2beta1ServiceLatency;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistDebugInfoKnowledgeAssistBehavior {
        answerGenerationRewriterOn?: boolean | null;
        appendedSearchContextCount?: number | null;
        conversationTranscriptHasMixedLanguages?: boolean | null;
        disableSyncDelivery?: boolean | null;
        endUserMetadataIncluded?: boolean | null;
        invalidItemsQuerySuggestionSkipped?: boolean | null;
        multipleQueriesGenerated?: boolean | null;
        previousQueriesIncluded?: boolean | null;
        primaryQueryRedactedAndReplaced?: boolean | null;
        queryContainedSearchContext?: boolean | null;
        queryGenerationAgentLanguageMismatch?: boolean | null;
        queryGenerationEndUserLanguageMismatch?: boolean | null;
        returnQueryOnly?: boolean | null;
        thirdPartyConnectorAllowed?: boolean | null;
        useCustomSafetyFilterLevel?: boolean | null;
        usePubsubDelivery?: boolean | null;
        useTranslatedMessage?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistDebugInfoQueryGenerationDebugInfo {
        candidatesTokenCount?: number | null;
        promptTokenCount?: number | null;
        totalTokenCount?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1KnowledgeOperationMetadata {
        doneTime?: string | null;
        exportOperationMetadata?: Schema$GoogleCloudDialogflowV2beta1ExportOperationMetadata;
        knowledgeBase?: string | null;
        state?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1Message {
        content?: string | null;
        createTime?: string | null;
        languageCode?: string | null;
        messageAnnotation?: Schema$GoogleCloudDialogflowV2beta1MessageAnnotation;
        name?: string | null;
        participant?: string | null;
        participantRole?: string | null;
        responseMessages?: Schema$GoogleCloudDialogflowV2beta1ResponseMessage[];
        sendTime?: string | null;
        sentimentAnalysis?: Schema$GoogleCloudDialogflowV2beta1SentimentAnalysisResult;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1MessageAnnotation {
        containEntities?: boolean | null;
        parts?: Schema$GoogleCloudDialogflowV2beta1AnnotatedMessagePart[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1OriginalDetectIntentRequest {
        payload?: {
            [key: string]: any;
        } | null;
        source?: string | null;
        version?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1QueryResult {
        action?: string | null;
        allRequiredParamsPresent?: boolean | null;
        cancelsSlotFilling?: boolean | null;
        diagnosticInfo?: {
            [key: string]: any;
        } | null;
        fulfillmentMessages?: Schema$GoogleCloudDialogflowV2beta1IntentMessage[];
        fulfillmentText?: string | null;
        intent?: Schema$GoogleCloudDialogflowV2beta1Intent;
        intentDetectionConfidence?: number | null;
        knowledgeAnswers?: Schema$GoogleCloudDialogflowV2beta1KnowledgeAnswers;
        languageCode?: string | null;
        outputContexts?: Schema$GoogleCloudDialogflowV2beta1Context[];
        parameters?: {
            [key: string]: any;
        } | null;
        queryText?: string | null;
        sentimentAnalysisResult?: Schema$GoogleCloudDialogflowV2beta1SentimentAnalysisResult;
        speechRecognitionConfidence?: number | null;
        webhookPayload?: {
            [key: string]: any;
        } | null;
        webhookSource?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ResponseMessage {
        endInteraction?: Schema$GoogleCloudDialogflowV2beta1ResponseMessageEndInteraction;
        liveAgentHandoff?: Schema$GoogleCloudDialogflowV2beta1ResponseMessageLiveAgentHandoff;
        mixedAudio?: Schema$GoogleCloudDialogflowV2beta1ResponseMessageMixedAudio;
        payload?: {
            [key: string]: any;
        } | null;
        telephonyTransferCall?: Schema$GoogleCloudDialogflowV2beta1ResponseMessageTelephonyTransferCall;
        text?: Schema$GoogleCloudDialogflowV2beta1ResponseMessageText;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ResponseMessageEndInteraction {
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ResponseMessageLiveAgentHandoff {
        metadata?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ResponseMessageMixedAudio {
        segments?: Schema$GoogleCloudDialogflowV2beta1ResponseMessageMixedAudioSegment[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ResponseMessageMixedAudioSegment {
        allowPlaybackInterruption?: boolean | null;
        audio?: string | null;
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ResponseMessageTelephonyTransferCall {
        phoneNumber?: string | null;
        sipUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ResponseMessageText {
        text?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1Sentiment {
        magnitude?: number | null;
        score?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1SentimentAnalysisResult {
        queryTextSentiment?: Schema$GoogleCloudDialogflowV2beta1Sentiment;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ServiceLatency {
        internalServiceLatencies?: Schema$GoogleCloudDialogflowV2beta1ServiceLatencyInternalServiceLatency[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ServiceLatencyInternalServiceLatency {
        completeTime?: string | null;
        latencyMs?: number | null;
        startTime?: string | null;
        step?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1SessionEntityType {
        entities?: Schema$GoogleCloudDialogflowV2beta1EntityTypeEntity[];
        entityOverrideMode?: string | null;
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1SetSuggestionFeatureConfigOperationMetadata {
        conversationProfile?: string | null;
        createTime?: string | null;
        participantRole?: string | null;
        suggestionFeatureType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1SmartReplyAnswer {
        answerRecord?: string | null;
        confidence?: number | null;
        reply?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1SpeechWordInfo {
        confidence?: number | null;
        endOffset?: string | null;
        startOffset?: string | null;
        word?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1StreamingRecognitionResult {
        confidence?: number | null;
        dtmfDigits?: Schema$GoogleCloudDialogflowV2beta1TelephonyDtmfEvents;
        isFinal?: boolean | null;
        languageCode?: string | null;
        messageType?: string | null;
        speechEndOffset?: string | null;
        speechWordInfo?: Schema$GoogleCloudDialogflowV2beta1SpeechWordInfo[];
        stability?: number | null;
        transcript?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1SuggestArticlesResponse {
        articleAnswers?: Schema$GoogleCloudDialogflowV2beta1ArticleAnswer[];
        contextSize?: number | null;
        latestMessage?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1SuggestDialogflowAssistsResponse {
        contextSize?: number | null;
        dialogflowAssistAnswers?: Schema$GoogleCloudDialogflowV2beta1DialogflowAssistAnswer[];
        latestMessage?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1SuggestFaqAnswersResponse {
        contextSize?: number | null;
        faqAnswers?: Schema$GoogleCloudDialogflowV2beta1FaqAnswer[];
        latestMessage?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1SuggestionResult {
        error?: Schema$GoogleRpcStatus;
        generateSuggestionsResponse?: Schema$GoogleCloudDialogflowV2beta1GenerateSuggestionsResponse;
        suggestArticlesResponse?: Schema$GoogleCloudDialogflowV2beta1SuggestArticlesResponse;
        suggestDialogflowAssistsResponse?: Schema$GoogleCloudDialogflowV2beta1SuggestDialogflowAssistsResponse;
        suggestEntityExtractionResponse?: Schema$GoogleCloudDialogflowV2beta1SuggestDialogflowAssistsResponse;
        suggestFaqAnswersResponse?: Schema$GoogleCloudDialogflowV2beta1SuggestFaqAnswersResponse;
        suggestKnowledgeAssistResponse?: Schema$GoogleCloudDialogflowV2beta1SuggestKnowledgeAssistResponse;
        suggestSmartRepliesResponse?: Schema$GoogleCloudDialogflowV2beta1SuggestSmartRepliesResponse;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1SuggestKnowledgeAssistResponse {
        contextSize?: number | null;
        knowledgeAssistAnswer?: Schema$GoogleCloudDialogflowV2beta1KnowledgeAssistAnswer;
        latestMessage?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1SuggestSmartRepliesResponse {
        contextSize?: number | null;
        latestMessage?: string | null;
        smartReplyAnswers?: Schema$GoogleCloudDialogflowV2beta1SmartReplyAnswer[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1SummarySuggestion {
        summarySections?: Schema$GoogleCloudDialogflowV2beta1SummarySuggestionSummarySection[];
    }
    export interface Schema$GoogleCloudDialogflowV2beta1SummarySuggestionSummarySection {
        section?: string | null;
        summary?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1TelephonyDtmfEvents {
        dtmfEvents?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ToolCall {
        action?: string | null;
        answerRecord?: string | null;
        cesApp?: string | null;
        cesTool?: string | null;
        cesToolset?: string | null;
        createTime?: string | null;
        inputParameters?: {
            [key: string]: any;
        } | null;
        state?: string | null;
        tool?: string | null;
        toolDisplayDetails?: string | null;
        toolDisplayName?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ToolCallResult {
        action?: string | null;
        answerRecord?: string | null;
        cesApp?: string | null;
        cesTool?: string | null;
        cesToolset?: string | null;
        content?: string | null;
        createTime?: string | null;
        error?: Schema$GoogleCloudDialogflowV2beta1ToolCallResultError;
        rawContent?: string | null;
        tool?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1ToolCallResultError {
        message?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1WebhookRequest {
        alternativeQueryResults?: Schema$GoogleCloudDialogflowV2beta1QueryResult[];
        originalDetectIntentRequest?: Schema$GoogleCloudDialogflowV2beta1OriginalDetectIntentRequest;
        queryResult?: Schema$GoogleCloudDialogflowV2beta1QueryResult;
        responseId?: string | null;
        session?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2beta1WebhookResponse {
        endInteraction?: boolean | null;
        followupEventInput?: Schema$GoogleCloudDialogflowV2beta1EventInput;
        fulfillmentMessages?: Schema$GoogleCloudDialogflowV2beta1IntentMessage[];
        fulfillmentText?: string | null;
        liveAgentHandoff?: boolean | null;
        outputContexts?: Schema$GoogleCloudDialogflowV2beta1Context[];
        payload?: {
            [key: string]: any;
        } | null;
        sessionEntityTypes?: Schema$GoogleCloudDialogflowV2beta1SessionEntityType[];
        source?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2ClearSuggestionFeatureConfigOperationMetadata {
        conversationProfile?: string | null;
        createTime?: string | null;
        participantRole?: string | null;
        suggestionFeatureType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2Context {
        lifespanCount?: number | null;
        name?: string | null;
        parameters?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowV2ConversationEvent {
        conversation?: string | null;
        errorStatus?: Schema$GoogleRpcStatus;
        newMessagePayload?: Schema$GoogleCloudDialogflowV2Message;
        newRecognitionResultPayload?: Schema$GoogleCloudDialogflowV2StreamingRecognitionResult;
        type?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2ConversationModel {
        articleSuggestionModelMetadata?: Schema$GoogleCloudDialogflowV2ArticleSuggestionModelMetadata;
        createTime?: string | null;
        datasets?: Schema$GoogleCloudDialogflowV2InputDataset[];
        displayName?: string | null;
        languageCode?: string | null;
        name?: string | null;
        satisfiesPzi?: boolean | null;
        satisfiesPzs?: boolean | null;
        smartReplyModelMetadata?: Schema$GoogleCloudDialogflowV2SmartReplyModelMetadata;
        state?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2CreateConversationDatasetOperationMetadata {
        conversationDataset?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2CreateConversationModelEvaluationOperationMetadata {
        conversationModel?: string | null;
        conversationModelEvaluation?: string | null;
        createTime?: string | null;
        state?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2CreateConversationModelOperationMetadata {
        conversationModel?: string | null;
        createTime?: string | null;
        doneTime?: string | null;
        state?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2DeleteConversationDatasetOperationMetadata {
    }
    export interface Schema$GoogleCloudDialogflowV2DeleteConversationModelOperationMetadata {
        conversationModel?: string | null;
        createTime?: string | null;
        doneTime?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2DeployConversationModelOperationMetadata {
        conversationModel?: string | null;
        createTime?: string | null;
        doneTime?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2EncryptionSpec {
        kmsKey?: string | null;
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2EntityType {
        autoExpansionMode?: string | null;
        displayName?: string | null;
        enableFuzzyExtraction?: boolean | null;
        entities?: Schema$GoogleCloudDialogflowV2EntityTypeEntity[];
        kind?: string | null;
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2EntityTypeEntity {
        synonyms?: string[] | null;
        value?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2EventInput {
        languageCode?: string | null;
        name?: string | null;
        parameters?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleCloudDialogflowV2ExportAgentResponse {
        agentContent?: string | null;
        agentUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2ExportOperationMetadata {
        exportedGcsDestination?: Schema$GoogleCloudDialogflowV2GcsDestination;
    }
    export interface Schema$GoogleCloudDialogflowV2FaqAnswer {
        answer?: string | null;
        answerRecord?: string | null;
        confidence?: number | null;
        metadata?: {
            [key: string]: string;
        } | null;
        question?: string | null;
        source?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2FreeFormSuggestion {
        response?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2GcsDestination {
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2GenerateSuggestionsResponse {
        generatorSuggestionAnswers?: Schema$GoogleCloudDialogflowV2GenerateSuggestionsResponseGeneratorSuggestionAnswer[];
        latestMessage?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2GenerateSuggestionsResponseGeneratorSuggestionAnswer {
        answerRecord?: string | null;
        generatorSuggestion?: Schema$GoogleCloudDialogflowV2GeneratorSuggestion;
        sourceGenerator?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2GeneratorSuggestion {
        agentCoachingSuggestion?: Schema$GoogleCloudDialogflowV2AgentCoachingSuggestion;
        freeFormSuggestion?: Schema$GoogleCloudDialogflowV2FreeFormSuggestion;
        summarySuggestion?: Schema$GoogleCloudDialogflowV2SummarySuggestion;
        toolCallInfo?: Schema$GoogleCloudDialogflowV2GeneratorSuggestionToolCallInfo[];
    }
    export interface Schema$GoogleCloudDialogflowV2GeneratorSuggestionToolCallInfo {
        toolCall?: Schema$GoogleCloudDialogflowV2ToolCall;
        toolCallResult?: Schema$GoogleCloudDialogflowV2ToolCallResult;
    }
    export interface Schema$GoogleCloudDialogflowV2HumanAgentAssistantEvent {
        conversation?: string | null;
        participant?: string | null;
        suggestionResults?: Schema$GoogleCloudDialogflowV2SuggestionResult[];
    }
    export interface Schema$GoogleCloudDialogflowV2ImportConversationDataOperationMetadata {
        conversationDataset?: string | null;
        createTime?: string | null;
        partialFailures?: Schema$GoogleRpcStatus[];
    }
    export interface Schema$GoogleCloudDialogflowV2ImportConversationDataOperationResponse {
        conversationDataset?: string | null;
        importCount?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowV2ImportDocumentsResponse {
        warnings?: Schema$GoogleRpcStatus[];
    }
    export interface Schema$GoogleCloudDialogflowV2IngestedContextReferenceDebugInfo {
        contextReferenceRetrieved?: boolean | null;
        ingestedParametersDebugInfo?: Schema$GoogleCloudDialogflowV2IngestedContextReferenceDebugInfoIngestedParameterDebugInfo[];
        projectNotAllowlisted?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IngestedContextReferenceDebugInfoIngestedParameterDebugInfo {
        ingestionStatus?: string | null;
        parameter?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2InitializeEncryptionSpecMetadata {
        request?: Schema$GoogleCloudDialogflowV2InitializeEncryptionSpecRequest;
    }
    export interface Schema$GoogleCloudDialogflowV2InitializeEncryptionSpecRequest {
        encryptionSpec?: Schema$GoogleCloudDialogflowV2EncryptionSpec;
    }
    export interface Schema$GoogleCloudDialogflowV2InputDataset {
        dataset?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2Intent {
        action?: string | null;
        defaultResponsePlatforms?: string[] | null;
        displayName?: string | null;
        endInteraction?: boolean | null;
        events?: string[] | null;
        followupIntentInfo?: Schema$GoogleCloudDialogflowV2IntentFollowupIntentInfo[];
        inputContextNames?: string[] | null;
        isFallback?: boolean | null;
        liveAgentHandoff?: boolean | null;
        messages?: Schema$GoogleCloudDialogflowV2IntentMessage[];
        mlDisabled?: boolean | null;
        name?: string | null;
        outputContexts?: Schema$GoogleCloudDialogflowV2Context[];
        parameters?: Schema$GoogleCloudDialogflowV2IntentParameter[];
        parentFollowupIntentName?: string | null;
        priority?: number | null;
        resetContexts?: boolean | null;
        rootFollowupIntentName?: string | null;
        trainingPhrases?: Schema$GoogleCloudDialogflowV2IntentTrainingPhrase[];
        webhookState?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentFollowupIntentInfo {
        followupIntentName?: string | null;
        parentFollowupIntentName?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessage {
        basicCard?: Schema$GoogleCloudDialogflowV2IntentMessageBasicCard;
        browseCarouselCard?: Schema$GoogleCloudDialogflowV2IntentMessageBrowseCarouselCard;
        card?: Schema$GoogleCloudDialogflowV2IntentMessageCard;
        carouselSelect?: Schema$GoogleCloudDialogflowV2IntentMessageCarouselSelect;
        image?: Schema$GoogleCloudDialogflowV2IntentMessageImage;
        linkOutSuggestion?: Schema$GoogleCloudDialogflowV2IntentMessageLinkOutSuggestion;
        listSelect?: Schema$GoogleCloudDialogflowV2IntentMessageListSelect;
        mediaContent?: Schema$GoogleCloudDialogflowV2IntentMessageMediaContent;
        payload?: {
            [key: string]: any;
        } | null;
        platform?: string | null;
        quickReplies?: Schema$GoogleCloudDialogflowV2IntentMessageQuickReplies;
        simpleResponses?: Schema$GoogleCloudDialogflowV2IntentMessageSimpleResponses;
        suggestions?: Schema$GoogleCloudDialogflowV2IntentMessageSuggestions;
        tableCard?: Schema$GoogleCloudDialogflowV2IntentMessageTableCard;
        text?: Schema$GoogleCloudDialogflowV2IntentMessageText;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageBasicCard {
        buttons?: Schema$GoogleCloudDialogflowV2IntentMessageBasicCardButton[];
        formattedText?: string | null;
        image?: Schema$GoogleCloudDialogflowV2IntentMessageImage;
        subtitle?: string | null;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageBasicCardButton {
        openUriAction?: Schema$GoogleCloudDialogflowV2IntentMessageBasicCardButtonOpenUriAction;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageBasicCardButtonOpenUriAction {
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageBrowseCarouselCard {
        imageDisplayOptions?: string | null;
        items?: Schema$GoogleCloudDialogflowV2IntentMessageBrowseCarouselCardBrowseCarouselCardItem[];
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageBrowseCarouselCardBrowseCarouselCardItem {
        description?: string | null;
        footer?: string | null;
        image?: Schema$GoogleCloudDialogflowV2IntentMessageImage;
        openUriAction?: Schema$GoogleCloudDialogflowV2IntentMessageBrowseCarouselCardBrowseCarouselCardItemOpenUrlAction;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageBrowseCarouselCardBrowseCarouselCardItemOpenUrlAction {
        url?: string | null;
        urlTypeHint?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageCard {
        buttons?: Schema$GoogleCloudDialogflowV2IntentMessageCardButton[];
        imageUri?: string | null;
        subtitle?: string | null;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageCardButton {
        postback?: string | null;
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageCarouselSelect {
        items?: Schema$GoogleCloudDialogflowV2IntentMessageCarouselSelectItem[];
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageCarouselSelectItem {
        description?: string | null;
        image?: Schema$GoogleCloudDialogflowV2IntentMessageImage;
        info?: Schema$GoogleCloudDialogflowV2IntentMessageSelectItemInfo;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageColumnProperties {
        header?: string | null;
        horizontalAlignment?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageImage {
        accessibilityText?: string | null;
        imageUri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageLinkOutSuggestion {
        destinationName?: string | null;
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageListSelect {
        items?: Schema$GoogleCloudDialogflowV2IntentMessageListSelectItem[];
        subtitle?: string | null;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageListSelectItem {
        description?: string | null;
        image?: Schema$GoogleCloudDialogflowV2IntentMessageImage;
        info?: Schema$GoogleCloudDialogflowV2IntentMessageSelectItemInfo;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageMediaContent {
        mediaObjects?: Schema$GoogleCloudDialogflowV2IntentMessageMediaContentResponseMediaObject[];
        mediaType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageMediaContentResponseMediaObject {
        contentUrl?: string | null;
        description?: string | null;
        icon?: Schema$GoogleCloudDialogflowV2IntentMessageImage;
        largeImage?: Schema$GoogleCloudDialogflowV2IntentMessageImage;
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageQuickReplies {
        quickReplies?: string[] | null;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageSelectItemInfo {
        key?: string | null;
        synonyms?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageSimpleResponse {
        displayText?: string | null;
        ssml?: string | null;
        textToSpeech?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageSimpleResponses {
        simpleResponses?: Schema$GoogleCloudDialogflowV2IntentMessageSimpleResponse[];
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageSuggestion {
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageSuggestions {
        suggestions?: Schema$GoogleCloudDialogflowV2IntentMessageSuggestion[];
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageTableCard {
        buttons?: Schema$GoogleCloudDialogflowV2IntentMessageBasicCardButton[];
        columnProperties?: Schema$GoogleCloudDialogflowV2IntentMessageColumnProperties[];
        image?: Schema$GoogleCloudDialogflowV2IntentMessageImage;
        rows?: Schema$GoogleCloudDialogflowV2IntentMessageTableCardRow[];
        subtitle?: string | null;
        title?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageTableCardCell {
        text?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageTableCardRow {
        cells?: Schema$GoogleCloudDialogflowV2IntentMessageTableCardCell[];
        dividerAfter?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentMessageText {
        text?: string[] | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentParameter {
        defaultValue?: string | null;
        displayName?: string | null;
        entityTypeDisplayName?: string | null;
        isList?: boolean | null;
        mandatory?: boolean | null;
        name?: string | null;
        prompts?: string[] | null;
        value?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentTrainingPhrase {
        name?: string | null;
        parts?: Schema$GoogleCloudDialogflowV2IntentTrainingPhrasePart[];
        timesAddedCount?: number | null;
        type?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2IntentTrainingPhrasePart {
        alias?: string | null;
        entityType?: string | null;
        text?: string | null;
        userDefined?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswer {
        answerRecord?: string | null;
        knowledgeAssistDebugInfo?: Schema$GoogleCloudDialogflowV2KnowledgeAssistDebugInfo;
        suggestedQuery?: Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswerSuggestedQuery;
        suggestedQueryAnswer?: Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswerKnowledgeAnswer;
    }
    export interface Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswerKnowledgeAnswer {
        answerText?: string | null;
        eventSource?: Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswerKnowledgeAnswerEventSource;
        faqSource?: Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswerKnowledgeAnswerFaqSource;
        generativeSource?: Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswerKnowledgeAnswerGenerativeSource;
        playbookSource?: Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswerKnowledgeAnswerGenerativeSource;
    }
    export interface Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswerKnowledgeAnswerEventSource {
        event?: string | null;
        snippets?: Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswerKnowledgeAnswerGenerativeSource;
    }
    export interface Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswerKnowledgeAnswerFaqSource {
        question?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswerKnowledgeAnswerGenerativeSource {
        snippets?: Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswerKnowledgeAnswerGenerativeSourceSnippet[];
    }
    export interface Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswerKnowledgeAnswerGenerativeSourceSnippet {
        metadata?: {
            [key: string]: any;
        } | null;
        text?: string | null;
        title?: string | null;
        uri?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswerSuggestedQuery {
        queryText?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2KnowledgeAssistDebugInfo {
        cesDebugInfo?: {
            [key: string]: any;
        } | null;
        datastoreResponseReason?: string | null;
        ingestedContextReferenceDebugInfo?: Schema$GoogleCloudDialogflowV2IngestedContextReferenceDebugInfo;
        knowledgeAssistBehavior?: Schema$GoogleCloudDialogflowV2KnowledgeAssistDebugInfoKnowledgeAssistBehavior;
        queryCategorizationFailureReason?: string | null;
        queryGenerationDebugInfo?: Schema$GoogleCloudDialogflowV2KnowledgeAssistDebugInfoQueryGenerationDebugInfo;
        queryGenerationFailureReason?: string | null;
        serviceLatency?: Schema$GoogleCloudDialogflowV2ServiceLatency;
    }
    export interface Schema$GoogleCloudDialogflowV2KnowledgeAssistDebugInfoKnowledgeAssistBehavior {
        answerGenerationRewriterOn?: boolean | null;
        appendedSearchContextCount?: number | null;
        conversationTranscriptHasMixedLanguages?: boolean | null;
        disableSyncDelivery?: boolean | null;
        endUserMetadataIncluded?: boolean | null;
        invalidItemsQuerySuggestionSkipped?: boolean | null;
        multipleQueriesGenerated?: boolean | null;
        previousQueriesIncluded?: boolean | null;
        primaryQueryRedactedAndReplaced?: boolean | null;
        queryContainedSearchContext?: boolean | null;
        queryGenerationAgentLanguageMismatch?: boolean | null;
        queryGenerationEndUserLanguageMismatch?: boolean | null;
        returnQueryOnly?: boolean | null;
        thirdPartyConnectorAllowed?: boolean | null;
        useCustomSafetyFilterLevel?: boolean | null;
        usePubsubDelivery?: boolean | null;
        useTranslatedMessage?: boolean | null;
    }
    export interface Schema$GoogleCloudDialogflowV2KnowledgeAssistDebugInfoQueryGenerationDebugInfo {
        candidatesTokenCount?: number | null;
        promptTokenCount?: number | null;
        totalTokenCount?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowV2KnowledgeOperationMetadata {
        doneTime?: string | null;
        exportOperationMetadata?: Schema$GoogleCloudDialogflowV2ExportOperationMetadata;
        knowledgeBase?: string | null;
        state?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2Message {
        content?: string | null;
        createTime?: string | null;
        languageCode?: string | null;
        messageAnnotation?: Schema$GoogleCloudDialogflowV2MessageAnnotation;
        name?: string | null;
        participant?: string | null;
        participantRole?: string | null;
        sendTime?: string | null;
        sentimentAnalysis?: Schema$GoogleCloudDialogflowV2SentimentAnalysisResult;
    }
    export interface Schema$GoogleCloudDialogflowV2MessageAnnotation {
        containEntities?: boolean | null;
        parts?: Schema$GoogleCloudDialogflowV2AnnotatedMessagePart[];
    }
    export interface Schema$GoogleCloudDialogflowV2OriginalDetectIntentRequest {
        payload?: {
            [key: string]: any;
        } | null;
        source?: string | null;
        version?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2QueryResult {
        action?: string | null;
        allRequiredParamsPresent?: boolean | null;
        cancelsSlotFilling?: boolean | null;
        diagnosticInfo?: {
            [key: string]: any;
        } | null;
        fulfillmentMessages?: Schema$GoogleCloudDialogflowV2IntentMessage[];
        fulfillmentText?: string | null;
        intent?: Schema$GoogleCloudDialogflowV2Intent;
        intentDetectionConfidence?: number | null;
        languageCode?: string | null;
        outputContexts?: Schema$GoogleCloudDialogflowV2Context[];
        parameters?: {
            [key: string]: any;
        } | null;
        queryText?: string | null;
        sentimentAnalysisResult?: Schema$GoogleCloudDialogflowV2SentimentAnalysisResult;
        speechRecognitionConfidence?: number | null;
        webhookPayload?: {
            [key: string]: any;
        } | null;
        webhookSource?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2Sentiment {
        magnitude?: number | null;
        score?: number | null;
    }
    export interface Schema$GoogleCloudDialogflowV2SentimentAnalysisResult {
        queryTextSentiment?: Schema$GoogleCloudDialogflowV2Sentiment;
    }
    export interface Schema$GoogleCloudDialogflowV2ServiceLatency {
        internalServiceLatencies?: Schema$GoogleCloudDialogflowV2ServiceLatencyInternalServiceLatency[];
    }
    export interface Schema$GoogleCloudDialogflowV2ServiceLatencyInternalServiceLatency {
        completeTime?: string | null;
        latencyMs?: number | null;
        startTime?: string | null;
        step?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2SessionEntityType {
        entities?: Schema$GoogleCloudDialogflowV2EntityTypeEntity[];
        entityOverrideMode?: string | null;
        name?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2SetSuggestionFeatureConfigOperationMetadata {
        conversationProfile?: string | null;
        createTime?: string | null;
        participantRole?: string | null;
        suggestionFeatureType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2SmartReplyAnswer {
        answerRecord?: string | null;
        confidence?: number | null;
        reply?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2SmartReplyModelMetadata {
        trainingModelType?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2SpeechWordInfo {
        confidence?: number | null;
        endOffset?: string | null;
        startOffset?: string | null;
        word?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2StreamingRecognitionResult {
        confidence?: number | null;
        isFinal?: boolean | null;
        languageCode?: string | null;
        messageType?: string | null;
        speechEndOffset?: string | null;
        speechWordInfo?: Schema$GoogleCloudDialogflowV2SpeechWordInfo[];
        transcript?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2SuggestArticlesResponse {
        articleAnswers?: Schema$GoogleCloudDialogflowV2ArticleAnswer[];
        contextSize?: number | null;
        latestMessage?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2SuggestFaqAnswersResponse {
        contextSize?: number | null;
        faqAnswers?: Schema$GoogleCloudDialogflowV2FaqAnswer[];
        latestMessage?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2SuggestionResult {
        error?: Schema$GoogleRpcStatus;
        generateSuggestionsResponse?: Schema$GoogleCloudDialogflowV2GenerateSuggestionsResponse;
        suggestArticlesResponse?: Schema$GoogleCloudDialogflowV2SuggestArticlesResponse;
        suggestFaqAnswersResponse?: Schema$GoogleCloudDialogflowV2SuggestFaqAnswersResponse;
        suggestKnowledgeAssistResponse?: Schema$GoogleCloudDialogflowV2SuggestKnowledgeAssistResponse;
        suggestSmartRepliesResponse?: Schema$GoogleCloudDialogflowV2SuggestSmartRepliesResponse;
    }
    export interface Schema$GoogleCloudDialogflowV2SuggestKnowledgeAssistResponse {
        contextSize?: number | null;
        knowledgeAssistAnswer?: Schema$GoogleCloudDialogflowV2KnowledgeAssistAnswer;
        latestMessage?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2SuggestSmartRepliesResponse {
        contextSize?: number | null;
        latestMessage?: string | null;
        smartReplyAnswers?: Schema$GoogleCloudDialogflowV2SmartReplyAnswer[];
    }
    export interface Schema$GoogleCloudDialogflowV2SummarySuggestion {
        summarySections?: Schema$GoogleCloudDialogflowV2SummarySuggestionSummarySection[];
    }
    export interface Schema$GoogleCloudDialogflowV2SummarySuggestionSummarySection {
        section?: string | null;
        summary?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2ToolCall {
        action?: string | null;
        answerRecord?: string | null;
        cesApp?: string | null;
        cesTool?: string | null;
        cesToolset?: string | null;
        createTime?: string | null;
        inputParameters?: {
            [key: string]: any;
        } | null;
        state?: string | null;
        tool?: string | null;
        toolDisplayDetails?: string | null;
        toolDisplayName?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2ToolCallResult {
        action?: string | null;
        answerRecord?: string | null;
        cesApp?: string | null;
        cesTool?: string | null;
        cesToolset?: string | null;
        content?: string | null;
        createTime?: string | null;
        error?: Schema$GoogleCloudDialogflowV2ToolCallResultError;
        rawContent?: string | null;
        tool?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2ToolCallResultError {
        message?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2UndeployConversationModelOperationMetadata {
        conversationModel?: string | null;
        createTime?: string | null;
        doneTime?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2WebhookRequest {
        originalDetectIntentRequest?: Schema$GoogleCloudDialogflowV2OriginalDetectIntentRequest;
        queryResult?: Schema$GoogleCloudDialogflowV2QueryResult;
        responseId?: string | null;
        session?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV2WebhookResponse {
        followupEventInput?: Schema$GoogleCloudDialogflowV2EventInput;
        fulfillmentMessages?: Schema$GoogleCloudDialogflowV2IntentMessage[];
        fulfillmentText?: string | null;
        outputContexts?: Schema$GoogleCloudDialogflowV2Context[];
        payload?: {
            [key: string]: any;
        } | null;
        sessionEntityTypes?: Schema$GoogleCloudDialogflowV2SessionEntityType[];
        source?: string | null;
    }
    export interface Schema$GoogleCloudDialogflowV3alpha1ConversationSignals {
        turnSignals?: Schema$GoogleCloudDialogflowV3alpha1TurnSignals;
    }
    export interface Schema$GoogleCloudDialogflowV3alpha1TurnSignals {
        agentEscalated?: boolean | null;
        dtmfUsed?: boolean | null;
        failureReasons?: string[] | null;
        noMatch?: boolean | null;
        noUserInput?: boolean | null;
        reachedEndPage?: boolean | null;
        sentimentMagnitude?: number | null;
        sentimentScore?: number | null;
        triggeredAbandonmentEvent?: boolean | null;
        userEscalated?: boolean | null;
        webhookStatuses?: string[] | null;
    }
    export interface Schema$GoogleCloudLocationListLocationsResponse {
        locations?: Schema$GoogleCloudLocationLocation[];
        nextPageToken?: string | null;
    }
    export interface Schema$GoogleCloudLocationLocation {
        displayName?: string | null;
        labels?: {
            [key: string]: string;
        } | null;
        locationId?: string | null;
        metadata?: {
            [key: string]: any;
        } | null;
        name?: string | null;
    }
    export interface Schema$GoogleLongrunningListOperationsResponse {
        nextPageToken?: string | null;
        operations?: Schema$GoogleLongrunningOperation[];
        unreachable?: string[] | null;
    }
    export interface Schema$GoogleLongrunningOperation {
        done?: boolean | null;
        error?: Schema$GoogleRpcStatus;
        metadata?: {
            [key: string]: any;
        } | null;
        name?: string | null;
        response?: {
            [key: string]: any;
        } | null;
    }
    export interface Schema$GoogleProtobufEmpty {
    }
    export interface Schema$GoogleRpcStatus {
        code?: number | null;
        details?: Array<{
            [key: string]: any;
        }> | null;
        message?: string | null;
    }
    export interface Schema$GoogleTypeLatLng {
        latitude?: number | null;
        longitude?: number | null;
    }
    export class Resource$Projects {
        context: APIRequestContext;
        locations: Resource$Projects$Locations;
        operations: Resource$Projects$Operations;
        constructor(context: APIRequestContext);
    }
    export class Resource$Projects$Locations {
        context: APIRequestContext;
        agents: Resource$Projects$Locations$Agents;
        operations: Resource$Projects$Locations$Operations;
        securitySettings: Resource$Projects$Locations$Securitysettings;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.get({
         *     name: 'projects/my-project/locations/my-location',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "displayName": "my_displayName",
         *   //   "labels": {},
         *   //   "locationId": "my_locationId",
         *   //   "metadata": {},
         *   //   "name": "my_name"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudLocationLocation>>;
        get(params: Params$Resource$Projects$Locations$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudLocationLocation>, callback: BodyResponseCallback<Schema$GoogleCloudLocationLocation>): void;
        get(params: Params$Resource$Projects$Locations$Get, callback: BodyResponseCallback<Schema$GoogleCloudLocationLocation>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudLocationLocation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.list({
         *     extraLocationTypes: 'placeholder-value',
         *
         *     filter: 'placeholder-value',
         *
         *     name: 'projects/my-project',
         *
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "locations": [],
         *   //   "nextPageToken": "my_nextPageToken"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudLocationListLocationsResponse>>;
        list(params: Params$Resource$Projects$Locations$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudLocationListLocationsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudLocationListLocationsResponse>): void;
        list(params: Params$Resource$Projects$Locations$List, callback: BodyResponseCallback<Schema$GoogleCloudLocationListLocationsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudLocationListLocationsResponse>): void;
    }
    export interface Params$Resource$Projects$Locations$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$List extends StandardParameters {
        /**
         *
         */
        extraLocationTypes?: string[];
        /**
         *
         */
        filter?: string;
        /**
         *
         */
        name?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
    }
    export class Resource$Projects$Locations$Agents {
        context: APIRequestContext;
        changelogs: Resource$Projects$Locations$Agents$Changelogs;
        conversations: Resource$Projects$Locations$Agents$Conversations;
        entityTypes: Resource$Projects$Locations$Agents$Entitytypes;
        environments: Resource$Projects$Locations$Agents$Environments;
        flows: Resource$Projects$Locations$Agents$Flows;
        generators: Resource$Projects$Locations$Agents$Generators;
        intents: Resource$Projects$Locations$Agents$Intents;
        playbooks: Resource$Projects$Locations$Agents$Playbooks;
        sessions: Resource$Projects$Locations$Agents$Sessions;
        testCases: Resource$Projects$Locations$Agents$Testcases;
        tools: Resource$Projects$Locations$Agents$Tools;
        transitionRouteGroups: Resource$Projects$Locations$Agents$Transitionroutegroups;
        webhooks: Resource$Projects$Locations$Agents$Webhooks;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.create({
         *     parent: 'projects/my-project/locations/my-location',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "advancedSettings": {},
         *       //   "answerFeedbackSettings": {},
         *       //   "avatarUri": "my_avatarUri",
         *       //   "bigqueryExportSettings": {},
         *       //   "clientCertificateSettings": {},
         *       //   "defaultLanguageCode": "my_defaultLanguageCode",
         *       //   "description": "my_description",
         *       //   "displayName": "my_displayName",
         *       //   "enableMultiLanguageTraining": false,
         *       //   "enableSpellCorrection": false,
         *       //   "enableStackdriverLogging": false,
         *       //   "genAppBuilderSettings": {},
         *       //   "gitIntegrationSettings": {},
         *       //   "locked": false,
         *       //   "name": "my_name",
         *       //   "personalizationSettings": {},
         *       //   "satisfiesPzi": false,
         *       //   "satisfiesPzs": false,
         *       //   "securitySettings": "my_securitySettings",
         *       //   "speechToTextSettings": {},
         *       //   "startFlow": "my_startFlow",
         *       //   "startPlaybook": "my_startPlaybook",
         *       //   "supportedLanguageCodes": [],
         *       //   "textToSpeechSettings": {},
         *       //   "timeZone": "my_timeZone"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "advancedSettings": {},
         *   //   "answerFeedbackSettings": {},
         *   //   "avatarUri": "my_avatarUri",
         *   //   "bigqueryExportSettings": {},
         *   //   "clientCertificateSettings": {},
         *   //   "defaultLanguageCode": "my_defaultLanguageCode",
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "enableMultiLanguageTraining": false,
         *   //   "enableSpellCorrection": false,
         *   //   "enableStackdriverLogging": false,
         *   //   "genAppBuilderSettings": {},
         *   //   "gitIntegrationSettings": {},
         *   //   "locked": false,
         *   //   "name": "my_name",
         *   //   "personalizationSettings": {},
         *   //   "satisfiesPzi": false,
         *   //   "satisfiesPzs": false,
         *   //   "securitySettings": "my_securitySettings",
         *   //   "speechToTextSettings": {},
         *   //   "startFlow": "my_startFlow",
         *   //   "startPlaybook": "my_startPlaybook",
         *   //   "supportedLanguageCodes": [],
         *   //   "textToSpeechSettings": {},
         *   //   "timeZone": "my_timeZone"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Agent>>;
        create(params: Params$Resource$Projects$Locations$Agents$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Agent>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Agent>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Agent>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Agent>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.delete({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.export({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "agentUri": "my_agentUri",
         *       //   "dataFormat": "my_dataFormat",
         *       //   "environment": "my_environment",
         *       //   "gitDestination": {},
         *       //   "includeBigqueryExportSettings": false
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        export(params: Params$Resource$Projects$Locations$Agents$Export, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        export(params?: Params$Resource$Projects$Locations$Agents$Export, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        export(params: Params$Resource$Projects$Locations$Agents$Export, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        export(params: Params$Resource$Projects$Locations$Agents$Export, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        export(params: Params$Resource$Projects$Locations$Agents$Export, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        export(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.get({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "advancedSettings": {},
         *   //   "answerFeedbackSettings": {},
         *   //   "avatarUri": "my_avatarUri",
         *   //   "bigqueryExportSettings": {},
         *   //   "clientCertificateSettings": {},
         *   //   "defaultLanguageCode": "my_defaultLanguageCode",
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "enableMultiLanguageTraining": false,
         *   //   "enableSpellCorrection": false,
         *   //   "enableStackdriverLogging": false,
         *   //   "genAppBuilderSettings": {},
         *   //   "gitIntegrationSettings": {},
         *   //   "locked": false,
         *   //   "name": "my_name",
         *   //   "personalizationSettings": {},
         *   //   "satisfiesPzi": false,
         *   //   "satisfiesPzs": false,
         *   //   "securitySettings": "my_securitySettings",
         *   //   "speechToTextSettings": {},
         *   //   "startFlow": "my_startFlow",
         *   //   "startPlaybook": "my_startPlaybook",
         *   //   "supportedLanguageCodes": [],
         *   //   "textToSpeechSettings": {},
         *   //   "timeZone": "my_timeZone"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Agent>>;
        get(params: Params$Resource$Projects$Locations$Agents$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Agent>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Agent>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Agent>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Agent>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.getGenerativeSettings({
         *     languageCode: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/generativeSettings',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "fallbackSettings": {},
         *   //   "generativeSafetySettings": {},
         *   //   "knowledgeConnectorSettings": {},
         *   //   "languageCode": "my_languageCode",
         *   //   "llmModelSettings": {},
         *   //   "name": "my_name"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        getGenerativeSettings(params: Params$Resource$Projects$Locations$Agents$Getgenerativesettings, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        getGenerativeSettings(params?: Params$Resource$Projects$Locations$Agents$Getgenerativesettings, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettings>>;
        getGenerativeSettings(params: Params$Resource$Projects$Locations$Agents$Getgenerativesettings, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        getGenerativeSettings(params: Params$Resource$Projects$Locations$Agents$Getgenerativesettings, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettings>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettings>): void;
        getGenerativeSettings(params: Params$Resource$Projects$Locations$Agents$Getgenerativesettings, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettings>): void;
        getGenerativeSettings(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettings>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.getValidationResult({
         *     languageCode: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/validationResult',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "flowValidationResults": [],
         *   //   "name": "my_name"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        getValidationResult(params: Params$Resource$Projects$Locations$Agents$Getvalidationresult, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        getValidationResult(params?: Params$Resource$Projects$Locations$Agents$Getvalidationresult, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1AgentValidationResult>>;
        getValidationResult(params: Params$Resource$Projects$Locations$Agents$Getvalidationresult, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        getValidationResult(params: Params$Resource$Projects$Locations$Agents$Getvalidationresult, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1AgentValidationResult>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1AgentValidationResult>): void;
        getValidationResult(params: Params$Resource$Projects$Locations$Agents$Getvalidationresult, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1AgentValidationResult>): void;
        getValidationResult(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1AgentValidationResult>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.list({
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "agents": [],
         *   //   "nextPageToken": "my_nextPageToken"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListAgentsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListAgentsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListAgentsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListAgentsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListAgentsResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.patch({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     updateMask: 'placeholder-value',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "advancedSettings": {},
         *       //   "answerFeedbackSettings": {},
         *       //   "avatarUri": "my_avatarUri",
         *       //   "bigqueryExportSettings": {},
         *       //   "clientCertificateSettings": {},
         *       //   "defaultLanguageCode": "my_defaultLanguageCode",
         *       //   "description": "my_description",
         *       //   "displayName": "my_displayName",
         *       //   "enableMultiLanguageTraining": false,
         *       //   "enableSpellCorrection": false,
         *       //   "enableStackdriverLogging": false,
         *       //   "genAppBuilderSettings": {},
         *       //   "gitIntegrationSettings": {},
         *       //   "locked": false,
         *       //   "name": "my_name",
         *       //   "personalizationSettings": {},
         *       //   "satisfiesPzi": false,
         *       //   "satisfiesPzs": false,
         *       //   "securitySettings": "my_securitySettings",
         *       //   "speechToTextSettings": {},
         *       //   "startFlow": "my_startFlow",
         *       //   "startPlaybook": "my_startPlaybook",
         *       //   "supportedLanguageCodes": [],
         *       //   "textToSpeechSettings": {},
         *       //   "timeZone": "my_timeZone"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "advancedSettings": {},
         *   //   "answerFeedbackSettings": {},
         *   //   "avatarUri": "my_avatarUri",
         *   //   "bigqueryExportSettings": {},
         *   //   "clientCertificateSettings": {},
         *   //   "defaultLanguageCode": "my_defaultLanguageCode",
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "enableMultiLanguageTraining": false,
         *   //   "enableSpellCorrection": false,
         *   //   "enableStackdriverLogging": false,
         *   //   "genAppBuilderSettings": {},
         *   //   "gitIntegrationSettings": {},
         *   //   "locked": false,
         *   //   "name": "my_name",
         *   //   "personalizationSettings": {},
         *   //   "satisfiesPzi": false,
         *   //   "satisfiesPzs": false,
         *   //   "securitySettings": "my_securitySettings",
         *   //   "speechToTextSettings": {},
         *   //   "startFlow": "my_startFlow",
         *   //   "startPlaybook": "my_startPlaybook",
         *   //   "supportedLanguageCodes": [],
         *   //   "textToSpeechSettings": {},
         *   //   "timeZone": "my_timeZone"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Agent>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Agent>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Agent>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Agent>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Agent>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.restore({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "agentContent": "my_agentContent",
         *       //   "agentUri": "my_agentUri",
         *       //   "gitSource": {},
         *       //   "restoreOption": "my_restoreOption"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        restore(params: Params$Resource$Projects$Locations$Agents$Restore, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        restore(params?: Params$Resource$Projects$Locations$Agents$Restore, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        restore(params: Params$Resource$Projects$Locations$Agents$Restore, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        restore(params: Params$Resource$Projects$Locations$Agents$Restore, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        restore(params: Params$Resource$Projects$Locations$Agents$Restore, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        restore(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.updateGenerativeSettings({
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/generativeSettings',
         *
         *       updateMask: 'placeholder-value',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {
         *         //   "fallbackSettings": {},
         *         //   "generativeSafetySettings": {},
         *         //   "knowledgeConnectorSettings": {},
         *         //   "languageCode": "my_languageCode",
         *         //   "llmModelSettings": {},
         *         //   "name": "my_name"
         *         // }
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "fallbackSettings": {},
         *   //   "generativeSafetySettings": {},
         *   //   "knowledgeConnectorSettings": {},
         *   //   "languageCode": "my_languageCode",
         *   //   "llmModelSettings": {},
         *   //   "name": "my_name"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        updateGenerativeSettings(params: Params$Resource$Projects$Locations$Agents$Updategenerativesettings, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        updateGenerativeSettings(params?: Params$Resource$Projects$Locations$Agents$Updategenerativesettings, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettings>>;
        updateGenerativeSettings(params: Params$Resource$Projects$Locations$Agents$Updategenerativesettings, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        updateGenerativeSettings(params: Params$Resource$Projects$Locations$Agents$Updategenerativesettings, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettings>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettings>): void;
        updateGenerativeSettings(params: Params$Resource$Projects$Locations$Agents$Updategenerativesettings, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettings>): void;
        updateGenerativeSettings(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettings>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.validate({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "languageCode": "my_languageCode"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "flowValidationResults": [],
         *   //   "name": "my_name"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        validate(params: Params$Resource$Projects$Locations$Agents$Validate, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        validate(params?: Params$Resource$Projects$Locations$Agents$Validate, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1AgentValidationResult>>;
        validate(params: Params$Resource$Projects$Locations$Agents$Validate, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        validate(params: Params$Resource$Projects$Locations$Agents$Validate, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1AgentValidationResult>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1AgentValidationResult>): void;
        validate(params: Params$Resource$Projects$Locations$Agents$Validate, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1AgentValidationResult>): void;
        validate(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1AgentValidationResult>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Create extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Agent;
    }
    export interface Params$Resource$Projects$Locations$Agents$Delete extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Export extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ExportAgentRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Getgenerativesettings extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Getvalidationresult extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Patch extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Agent;
    }
    export interface Params$Resource$Projects$Locations$Agents$Restore extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1RestoreAgentRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Updategenerativesettings extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1GenerativeSettings;
    }
    export interface Params$Resource$Projects$Locations$Agents$Validate extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ValidateAgentRequest;
    }
    export class Resource$Projects$Locations$Agents$Changelogs {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.changelogs.get({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/changelogs/my-changelog',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "action": "my_action",
         *   //   "createTime": "my_createTime",
         *   //   "displayName": "my_displayName",
         *   //   "languageCode": "my_languageCode",
         *   //   "name": "my_name",
         *   //   "resource": "my_resource",
         *   //   "type": "my_type",
         *   //   "userEmail": "my_userEmail"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Changelogs$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Changelogs$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Changelog>>;
        get(params: Params$Resource$Projects$Locations$Agents$Changelogs$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Changelogs$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Changelog>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Changelog>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Changelogs$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Changelog>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Changelog>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.changelogs.list({
         *     filter: 'placeholder-value',
         *
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "changelogs": [],
         *   //   "nextPageToken": "my_nextPageToken"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Changelogs$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Changelogs$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListChangelogsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Changelogs$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Changelogs$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListChangelogsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListChangelogsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Changelogs$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListChangelogsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListChangelogsResponse>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Changelogs$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Changelogs$List extends StandardParameters {
        /**
         *
         */
        filter?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export class Resource$Projects$Locations$Agents$Conversations {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.conversations.delete({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/conversations/my-conversation',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Conversations$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Conversations$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Conversations$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Conversations$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Conversations$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.conversations.get({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/conversations/my-conversation',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "duration": "my_duration",
         *   //   "environment": {},
         *   //   "flowVersions": {},
         *   //   "flows": [],
         *   //   "intents": [],
         *   //   "interactions": [],
         *   //   "languageCode": "my_languageCode",
         *   //   "metrics": {},
         *   //   "name": "my_name",
         *   //   "pages": [],
         *   //   "startTime": "my_startTime",
         *   //   "type": "my_type"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Conversations$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Conversations$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Conversation>>;
        get(params: Params$Resource$Projects$Locations$Agents$Conversations$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Conversations$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Conversation>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Conversation>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Conversations$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Conversation>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Conversation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.conversations.list({
         *     filter: 'placeholder-value',
         *
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "conversations": [],
         *   //   "nextPageToken": "my_nextPageToken"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Conversations$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Conversations$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListConversationsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Conversations$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Conversations$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListConversationsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListConversationsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Conversations$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListConversationsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListConversationsResponse>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Conversations$Delete extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Conversations$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Conversations$List extends StandardParameters {
        /**
         *
         */
        filter?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export class Resource$Projects$Locations$Agents$Entitytypes {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.entityTypes.create({
         *     languageCode: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "autoExpansionMode": "my_autoExpansionMode",
         *       //   "displayName": "my_displayName",
         *       //   "enableFuzzyExtraction": false,
         *       //   "entities": [],
         *       //   "excludedPhrases": [],
         *       //   "kind": "my_kind",
         *       //   "name": "my_name",
         *       //   "redact": false
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "autoExpansionMode": "my_autoExpansionMode",
         *   //   "displayName": "my_displayName",
         *   //   "enableFuzzyExtraction": false,
         *   //   "entities": [],
         *   //   "excludedPhrases": [],
         *   //   "kind": "my_kind",
         *   //   "name": "my_name",
         *   //   "redact": false
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Entitytypes$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1EntityType>>;
        create(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1EntityType>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1EntityType>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1EntityType>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1EntityType>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.entityTypes.delete({
         *     force: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/entityTypes/my-entityType',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Entitytypes$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.entityTypes.export({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "dataFormat": "my_dataFormat",
         *       //   "entityTypes": [],
         *       //   "entityTypesContentInline": false,
         *       //   "entityTypesUri": "my_entityTypesUri",
         *       //   "languageCode": "my_languageCode"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        export(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Export, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        export(params?: Params$Resource$Projects$Locations$Agents$Entitytypes$Export, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        export(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Export, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        export(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Export, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        export(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Export, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        export(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.entityTypes.get({
         *     languageCode: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/entityTypes/my-entityType',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "autoExpansionMode": "my_autoExpansionMode",
         *   //   "displayName": "my_displayName",
         *   //   "enableFuzzyExtraction": false,
         *   //   "entities": [],
         *   //   "excludedPhrases": [],
         *   //   "kind": "my_kind",
         *   //   "name": "my_name",
         *   //   "redact": false
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Entitytypes$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1EntityType>>;
        get(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1EntityType>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1EntityType>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1EntityType>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1EntityType>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.entityTypes.import({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "entityTypesContent": {},
         *       //   "entityTypesUri": "my_entityTypesUri",
         *       //   "mergeOption": "my_mergeOption",
         *       //   "targetEntityType": "my_targetEntityType"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        import(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Import, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        import(params?: Params$Resource$Projects$Locations$Agents$Entitytypes$Import, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        import(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Import, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        import(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Import, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        import(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Import, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        import(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.entityTypes.list({
         *     languageCode: 'placeholder-value',
         *
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "entityTypes": [],
         *   //   "nextPageToken": "my_nextPageToken"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Entitytypes$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Entitytypes$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListEntityTypesResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Entitytypes$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Entitytypes$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListEntityTypesResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListEntityTypesResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Entitytypes$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListEntityTypesResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListEntityTypesResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.entityTypes.patch({
         *     languageCode: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/entityTypes/my-entityType',
         *
         *     updateMask: 'placeholder-value',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "autoExpansionMode": "my_autoExpansionMode",
         *       //   "displayName": "my_displayName",
         *       //   "enableFuzzyExtraction": false,
         *       //   "entities": [],
         *       //   "excludedPhrases": [],
         *       //   "kind": "my_kind",
         *       //   "name": "my_name",
         *       //   "redact": false
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "autoExpansionMode": "my_autoExpansionMode",
         *   //   "displayName": "my_displayName",
         *   //   "enableFuzzyExtraction": false,
         *   //   "entities": [],
         *   //   "excludedPhrases": [],
         *   //   "kind": "my_kind",
         *   //   "name": "my_name",
         *   //   "redact": false
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Entitytypes$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1EntityType>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1EntityType>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1EntityType>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Entitytypes$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1EntityType>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1EntityType>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Entitytypes$Create extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1EntityType;
    }
    export interface Params$Resource$Projects$Locations$Agents$Entitytypes$Delete extends StandardParameters {
        /**
         *
         */
        force?: boolean;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Entitytypes$Export extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ExportEntityTypesRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Entitytypes$Get extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Entitytypes$Import extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ImportEntityTypesRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Entitytypes$List extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Entitytypes$Patch extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1EntityType;
    }
    export class Resource$Projects$Locations$Agents$Environments {
        context: APIRequestContext;
        continuousTestResults: Resource$Projects$Locations$Agents$Environments$Continuoustestresults;
        deployments: Resource$Projects$Locations$Agents$Environments$Deployments;
        experiments: Resource$Projects$Locations$Agents$Environments$Experiments;
        sessions: Resource$Projects$Locations$Agents$Environments$Sessions;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.environments.create({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "description": "my_description",
         *       //   "displayName": "my_displayName",
         *       //   "name": "my_name",
         *       //   "testCasesConfig": {},
         *       //   "updateTime": "my_updateTime",
         *       //   "versionConfigs": [],
         *       //   "webhookConfig": {}
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Environments$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Environments$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        create(params: Params$Resource$Projects$Locations$Agents$Environments$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Environments$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Environments$Create, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        create(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.environments.delete({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Environments$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Environments$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Environments$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Environments$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Environments$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.deployFlow({
         *       environment:
         *         'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {
         *         //   "flowVersion": "my_flowVersion"
         *         // }
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        deployFlow(params: Params$Resource$Projects$Locations$Agents$Environments$Deployflow, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        deployFlow(params?: Params$Resource$Projects$Locations$Agents$Environments$Deployflow, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        deployFlow(params: Params$Resource$Projects$Locations$Agents$Environments$Deployflow, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        deployFlow(params: Params$Resource$Projects$Locations$Agents$Environments$Deployflow, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        deployFlow(params: Params$Resource$Projects$Locations$Agents$Environments$Deployflow, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        deployFlow(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.environments.get({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "name": "my_name",
         *   //   "testCasesConfig": {},
         *   //   "updateTime": "my_updateTime",
         *   //   "versionConfigs": [],
         *   //   "webhookConfig": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Environments$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Environment>>;
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Environment>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Environment>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Environment>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Environment>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.environments.list({
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "environments": [],
         *   //   "nextPageToken": "my_nextPageToken"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Environments$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Environments$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListEnvironmentsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListEnvironmentsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListEnvironmentsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListEnvironmentsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListEnvironmentsResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.lookupEnvironmentHistory(
         *       {
         *         name: 'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment',
         *
         *         pageSize: 'placeholder-value',
         *
         *         pageToken: 'placeholder-value',
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "environments": [],
         *   //   "nextPageToken": "my_nextPageToken"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        lookupEnvironmentHistory(params: Params$Resource$Projects$Locations$Agents$Environments$Lookupenvironmenthistory, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        lookupEnvironmentHistory(params?: Params$Resource$Projects$Locations$Agents$Environments$Lookupenvironmenthistory, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1LookupEnvironmentHistoryResponse>>;
        lookupEnvironmentHistory(params: Params$Resource$Projects$Locations$Agents$Environments$Lookupenvironmenthistory, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        lookupEnvironmentHistory(params: Params$Resource$Projects$Locations$Agents$Environments$Lookupenvironmenthistory, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1LookupEnvironmentHistoryResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1LookupEnvironmentHistoryResponse>): void;
        lookupEnvironmentHistory(params: Params$Resource$Projects$Locations$Agents$Environments$Lookupenvironmenthistory, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1LookupEnvironmentHistoryResponse>): void;
        lookupEnvironmentHistory(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1LookupEnvironmentHistoryResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.environments.patch({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment',
         *
         *     updateMask: 'placeholder-value',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "description": "my_description",
         *       //   "displayName": "my_displayName",
         *       //   "name": "my_name",
         *       //   "testCasesConfig": {},
         *       //   "updateTime": "my_updateTime",
         *       //   "versionConfigs": [],
         *       //   "webhookConfig": {}
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Environments$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Environments$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Environments$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Environments$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Environments$Patch, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.runContinuousTest({
         *       environment:
         *         'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {}
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        runContinuousTest(params: Params$Resource$Projects$Locations$Agents$Environments$Runcontinuoustest, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        runContinuousTest(params?: Params$Resource$Projects$Locations$Agents$Environments$Runcontinuoustest, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        runContinuousTest(params: Params$Resource$Projects$Locations$Agents$Environments$Runcontinuoustest, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        runContinuousTest(params: Params$Resource$Projects$Locations$Agents$Environments$Runcontinuoustest, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        runContinuousTest(params: Params$Resource$Projects$Locations$Agents$Environments$Runcontinuoustest, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        runContinuousTest(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Create extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Environment;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Delete extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Deployflow extends StandardParameters {
        /**
         *
         */
        environment?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1DeployFlowRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Lookupenvironmenthistory extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Patch extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Environment;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Runcontinuoustest extends StandardParameters {
        /**
         *
         */
        environment?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1RunContinuousTestRequest;
    }
    export class Resource$Projects$Locations$Agents$Environments$Continuoustestresults {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.continuousTestResults.list(
         *       {
         *         pageSize: 'placeholder-value',
         *
         *         pageToken: 'placeholder-value',
         *
         *         parent:
         *           'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment',
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "continuousTestResults": [],
         *   //   "nextPageToken": "my_nextPageToken"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Continuoustestresults$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Environments$Continuoustestresults$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListContinuousTestResultsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Continuoustestresults$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Continuoustestresults$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListContinuousTestResultsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListContinuousTestResultsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Continuoustestresults$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListContinuousTestResultsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListContinuousTestResultsResponse>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Continuoustestresults$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export class Resource$Projects$Locations$Agents$Environments$Deployments {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.deployments.get({
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/deployments/my-deployment',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "endTime": "my_endTime",
         *   //   "flowVersion": "my_flowVersion",
         *   //   "name": "my_name",
         *   //   "result": {},
         *   //   "startTime": "my_startTime",
         *   //   "state": "my_state"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Deployments$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Environments$Deployments$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Deployment>>;
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Deployments$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Deployments$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Deployment>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Deployment>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Deployments$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Deployment>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Deployment>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.deployments.list({
         *       pageSize: 'placeholder-value',
         *
         *       pageToken: 'placeholder-value',
         *
         *       parent:
         *         'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "deployments": [],
         *   //   "nextPageToken": "my_nextPageToken"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Deployments$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Environments$Deployments$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListDeploymentsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Deployments$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Deployments$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListDeploymentsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListDeploymentsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Deployments$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListDeploymentsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListDeploymentsResponse>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Deployments$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Deployments$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export class Resource$Projects$Locations$Agents$Environments$Experiments {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.experiments.create({
         *       parent:
         *         'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {
         *         //   "createTime": "my_createTime",
         *         //   "definition": {},
         *         //   "description": "my_description",
         *         //   "displayName": "my_displayName",
         *         //   "endTime": "my_endTime",
         *         //   "experimentLength": "my_experimentLength",
         *         //   "lastUpdateTime": "my_lastUpdateTime",
         *         //   "name": "my_name",
         *         //   "result": {},
         *         //   "rolloutConfig": {},
         *         //   "rolloutFailureReason": "my_rolloutFailureReason",
         *         //   "rolloutState": {},
         *         //   "startTime": "my_startTime",
         *         //   "state": "my_state",
         *         //   "variantsHistory": []
         *         // }
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "createTime": "my_createTime",
         *   //   "definition": {},
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "endTime": "my_endTime",
         *   //   "experimentLength": "my_experimentLength",
         *   //   "lastUpdateTime": "my_lastUpdateTime",
         *   //   "name": "my_name",
         *   //   "result": {},
         *   //   "rolloutConfig": {},
         *   //   "rolloutFailureReason": "my_rolloutFailureReason",
         *   //   "rolloutState": {},
         *   //   "startTime": "my_startTime",
         *   //   "state": "my_state",
         *   //   "variantsHistory": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Experiment>>;
        create(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.experiments.delete({
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/experiments/my-experiment',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.experiments.get({
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/experiments/my-experiment',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "createTime": "my_createTime",
         *   //   "definition": {},
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "endTime": "my_endTime",
         *   //   "experimentLength": "my_experimentLength",
         *   //   "lastUpdateTime": "my_lastUpdateTime",
         *   //   "name": "my_name",
         *   //   "result": {},
         *   //   "rolloutConfig": {},
         *   //   "rolloutFailureReason": "my_rolloutFailureReason",
         *   //   "rolloutState": {},
         *   //   "startTime": "my_startTime",
         *   //   "state": "my_state",
         *   //   "variantsHistory": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Experiment>>;
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.experiments.list({
         *       pageSize: 'placeholder-value',
         *
         *       pageToken: 'placeholder-value',
         *
         *       parent:
         *         'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "experiments": [],
         *   //   "nextPageToken": "my_nextPageToken"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Environments$Experiments$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListExperimentsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListExperimentsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListExperimentsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListExperimentsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListExperimentsResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.experiments.patch({
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/experiments/my-experiment',
         *
         *       updateMask: 'placeholder-value',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {
         *         //   "createTime": "my_createTime",
         *         //   "definition": {},
         *         //   "description": "my_description",
         *         //   "displayName": "my_displayName",
         *         //   "endTime": "my_endTime",
         *         //   "experimentLength": "my_experimentLength",
         *         //   "lastUpdateTime": "my_lastUpdateTime",
         *         //   "name": "my_name",
         *         //   "result": {},
         *         //   "rolloutConfig": {},
         *         //   "rolloutFailureReason": "my_rolloutFailureReason",
         *         //   "rolloutState": {},
         *         //   "startTime": "my_startTime",
         *         //   "state": "my_state",
         *         //   "variantsHistory": []
         *         // }
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "createTime": "my_createTime",
         *   //   "definition": {},
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "endTime": "my_endTime",
         *   //   "experimentLength": "my_experimentLength",
         *   //   "lastUpdateTime": "my_lastUpdateTime",
         *   //   "name": "my_name",
         *   //   "result": {},
         *   //   "rolloutConfig": {},
         *   //   "rolloutFailureReason": "my_rolloutFailureReason",
         *   //   "rolloutState": {},
         *   //   "startTime": "my_startTime",
         *   //   "state": "my_state",
         *   //   "variantsHistory": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Experiment>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.experiments.start({
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/experiments/my-experiment',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {}
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "createTime": "my_createTime",
         *   //   "definition": {},
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "endTime": "my_endTime",
         *   //   "experimentLength": "my_experimentLength",
         *   //   "lastUpdateTime": "my_lastUpdateTime",
         *   //   "name": "my_name",
         *   //   "result": {},
         *   //   "rolloutConfig": {},
         *   //   "rolloutFailureReason": "my_rolloutFailureReason",
         *   //   "rolloutState": {},
         *   //   "startTime": "my_startTime",
         *   //   "state": "my_state",
         *   //   "variantsHistory": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        start(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Start, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        start(params?: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Start, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Experiment>>;
        start(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Start, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        start(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Start, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
        start(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Start, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
        start(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.experiments.stop({
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/experiments/my-experiment',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {}
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "createTime": "my_createTime",
         *   //   "definition": {},
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "endTime": "my_endTime",
         *   //   "experimentLength": "my_experimentLength",
         *   //   "lastUpdateTime": "my_lastUpdateTime",
         *   //   "name": "my_name",
         *   //   "result": {},
         *   //   "rolloutConfig": {},
         *   //   "rolloutFailureReason": "my_rolloutFailureReason",
         *   //   "rolloutState": {},
         *   //   "startTime": "my_startTime",
         *   //   "state": "my_state",
         *   //   "variantsHistory": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        stop(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Stop, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        stop(params?: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Stop, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Experiment>>;
        stop(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Stop, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        stop(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Stop, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
        stop(params: Params$Resource$Projects$Locations$Agents$Environments$Experiments$Stop, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
        stop(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Experiment>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Experiments$Create extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Experiment;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Experiments$Delete extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Experiments$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Experiments$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Experiments$Patch extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Experiment;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Experiments$Start extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1StartExperimentRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Experiments$Stop extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1StopExperimentRequest;
    }
    export class Resource$Projects$Locations$Agents$Environments$Sessions {
        context: APIRequestContext;
        entityTypes: Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.sessions.detectIntent(
         *       {
         *         session:
         *           'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/sessions/my-session',
         *
         *         // Request body metadata
         *         requestBody: {
         *           // request body parameters
         *           // {
         *           //   "outputAudioConfig": {},
         *           //   "queryInput": {},
         *           //   "queryParams": {},
         *           //   "responseView": "my_responseView",
         *           //   "session": "my_session"
         *           // }
         *         },
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "allowCancellation": false,
         *   //   "outputAudio": "my_outputAudio",
         *   //   "outputAudioConfig": {},
         *   //   "queryResult": {},
         *   //   "responseId": "my_responseId",
         *   //   "responseType": "my_responseType"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        detectIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Detectintent, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        detectIntent(params?: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Detectintent, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>>;
        detectIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Detectintent, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        detectIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Detectintent, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>): void;
        detectIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Detectintent, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>): void;
        detectIntent(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.sessions.fulfillIntent(
         *       {
         *         session:
         *           'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/sessions/my-session',
         *
         *         // Request body metadata
         *         requestBody: {
         *           // request body parameters
         *           // {
         *           //   "match": {},
         *           //   "matchIntentRequest": {},
         *           //   "outputAudioConfig": {}
         *           // }
         *         },
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "outputAudio": "my_outputAudio",
         *   //   "outputAudioConfig": {},
         *   //   "queryResult": {},
         *   //   "responseId": "my_responseId"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        fulfillIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Fulfillintent, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        fulfillIntent(params?: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Fulfillintent, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1FulfillIntentResponse>>;
        fulfillIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Fulfillintent, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        fulfillIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Fulfillintent, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FulfillIntentResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FulfillIntentResponse>): void;
        fulfillIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Fulfillintent, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FulfillIntentResponse>): void;
        fulfillIntent(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FulfillIntentResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.sessions.matchIntent(
         *       {
         *         session:
         *           'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/sessions/my-session',
         *
         *         // Request body metadata
         *         requestBody: {
         *           // request body parameters
         *           // {
         *           //   "persistParameterChanges": false,
         *           //   "queryInput": {},
         *           //   "queryParams": {}
         *           // }
         *         },
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "currentPage": {},
         *   //   "matches": [],
         *   //   "text": "my_text",
         *   //   "transcript": "my_transcript",
         *   //   "triggerEvent": "my_triggerEvent",
         *   //   "triggerIntent": "my_triggerIntent"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        matchIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Matchintent, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        matchIntent(params?: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Matchintent, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1MatchIntentResponse>>;
        matchIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Matchintent, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        matchIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Matchintent, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1MatchIntentResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1MatchIntentResponse>): void;
        matchIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Matchintent, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1MatchIntentResponse>): void;
        matchIntent(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1MatchIntentResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.sessions.serverStreamingDetectIntent(
         *       {
         *         session:
         *           'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/sessions/my-session',
         *
         *         // Request body metadata
         *         requestBody: {
         *           // request body parameters
         *           // {
         *           //   "outputAudioConfig": {},
         *           //   "queryInput": {},
         *           //   "queryParams": {},
         *           //   "responseView": "my_responseView",
         *           //   "session": "my_session"
         *           // }
         *         },
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "allowCancellation": false,
         *   //   "outputAudio": "my_outputAudio",
         *   //   "outputAudioConfig": {},
         *   //   "queryResult": {},
         *   //   "responseId": "my_responseId",
         *   //   "responseType": "my_responseType"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        serverStreamingDetectIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Serverstreamingdetectintent, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        serverStreamingDetectIntent(params?: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Serverstreamingdetectintent, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>>;
        serverStreamingDetectIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Serverstreamingdetectintent, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        serverStreamingDetectIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Serverstreamingdetectintent, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>): void;
        serverStreamingDetectIntent(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Serverstreamingdetectintent, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>): void;
        serverStreamingDetectIntent(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Sessions$Detectintent extends StandardParameters {
        /**
         *
         */
        session?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1DetectIntentRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Sessions$Fulfillintent extends StandardParameters {
        /**
         *
         */
        session?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1FulfillIntentRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Sessions$Matchintent extends StandardParameters {
        /**
         *
         */
        session?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1MatchIntentRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Sessions$Serverstreamingdetectintent extends StandardParameters {
        /**
         *
         */
        session?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1DetectIntentRequest;
    }
    export class Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.sessions.entityTypes.create(
         *       {
         *         parent:
         *           'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/sessions/my-session',
         *
         *         // Request body metadata
         *         requestBody: {
         *           // request body parameters
         *           // {
         *           //   "entities": [],
         *           //   "entityOverrideMode": "my_entityOverrideMode",
         *           //   "name": "my_name"
         *           // }
         *         },
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "entities": [],
         *   //   "entityOverrideMode": "my_entityOverrideMode",
         *   //   "name": "my_name"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>>;
        create(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.sessions.entityTypes.delete(
         *       {
         *         name: 'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/sessions/my-session/entityTypes/my-entityType',
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.sessions.entityTypes.get(
         *       {
         *         name: 'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/sessions/my-session/entityTypes/my-entityType',
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "entities": [],
         *   //   "entityOverrideMode": "my_entityOverrideMode",
         *   //   "name": "my_name"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>>;
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.sessions.entityTypes.list(
         *       {
         *         pageSize: 'placeholder-value',
         *
         *         pageToken: 'placeholder-value',
         *
         *         parent:
         *           'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/sessions/my-session',
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "sessionEntityTypes": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListSessionEntityTypesResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListSessionEntityTypesResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListSessionEntityTypesResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListSessionEntityTypesResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListSessionEntityTypesResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.environments.sessions.entityTypes.patch(
         *       {
         *         name: 'projects/my-project/locations/my-location/agents/my-agent/environments/my-environment/sessions/my-session/entityTypes/my-entityType',
         *
         *         updateMask: 'placeholder-value',
         *
         *         // Request body metadata
         *         requestBody: {
         *           // request body parameters
         *           // {
         *           //   "entities": [],
         *           //   "entityOverrideMode": "my_entityOverrideMode",
         *           //   "name": "my_name"
         *           // }
         *         },
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "entities": [],
         *   //   "entityOverrideMode": "my_entityOverrideMode",
         *   //   "name": "my_name"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Create extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Delete extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Environments$Sessions$Entitytypes$Patch extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType;
    }
    export class Resource$Projects$Locations$Agents$Flows {
        context: APIRequestContext;
        pages: Resource$Projects$Locations$Agents$Flows$Pages;
        transitionRouteGroups: Resource$Projects$Locations$Agents$Flows$Transitionroutegroups;
        versions: Resource$Projects$Locations$Agents$Flows$Versions;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.create({
         *     languageCode: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "advancedSettings": {},
         *       //   "description": "my_description",
         *       //   "displayName": "my_displayName",
         *       //   "eventHandlers": [],
         *       //   "inputParameterDefinitions": [],
         *       //   "knowledgeConnectorSettings": {},
         *       //   "locked": false,
         *       //   "multiLanguageSettings": {},
         *       //   "name": "my_name",
         *       //   "nluSettings": {},
         *       //   "outputParameterDefinitions": [],
         *       //   "transitionRouteGroups": [],
         *       //   "transitionRoutes": []
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "advancedSettings": {},
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "eventHandlers": [],
         *   //   "inputParameterDefinitions": [],
         *   //   "knowledgeConnectorSettings": {},
         *   //   "locked": false,
         *   //   "multiLanguageSettings": {},
         *   //   "name": "my_name",
         *   //   "nluSettings": {},
         *   //   "outputParameterDefinitions": [],
         *   //   "transitionRouteGroups": [],
         *   //   "transitionRoutes": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Flows$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Flow>>;
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Flow>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Flow>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Flow>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Flow>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.delete({
         *     force: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Flows$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.export({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "flowUri": "my_flowUri",
         *       //   "includeReferencedFlows": false
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        export(params: Params$Resource$Projects$Locations$Agents$Flows$Export, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        export(params?: Params$Resource$Projects$Locations$Agents$Flows$Export, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        export(params: Params$Resource$Projects$Locations$Agents$Flows$Export, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        export(params: Params$Resource$Projects$Locations$Agents$Flows$Export, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        export(params: Params$Resource$Projects$Locations$Agents$Flows$Export, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        export(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.get({
         *     languageCode: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "advancedSettings": {},
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "eventHandlers": [],
         *   //   "inputParameterDefinitions": [],
         *   //   "knowledgeConnectorSettings": {},
         *   //   "locked": false,
         *   //   "multiLanguageSettings": {},
         *   //   "name": "my_name",
         *   //   "nluSettings": {},
         *   //   "outputParameterDefinitions": [],
         *   //   "transitionRouteGroups": [],
         *   //   "transitionRoutes": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Flows$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Flow>>;
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Flow>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Flow>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Flow>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Flow>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.flows.getValidationResult({
         *       languageCode: 'placeholder-value',
         *
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow/validationResult',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "name": "my_name",
         *   //   "updateTime": "my_updateTime",
         *   //   "validationMessages": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        getValidationResult(params: Params$Resource$Projects$Locations$Agents$Flows$Getvalidationresult, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        getValidationResult(params?: Params$Resource$Projects$Locations$Agents$Flows$Getvalidationresult, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1FlowValidationResult>>;
        getValidationResult(params: Params$Resource$Projects$Locations$Agents$Flows$Getvalidationresult, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        getValidationResult(params: Params$Resource$Projects$Locations$Agents$Flows$Getvalidationresult, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FlowValidationResult>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FlowValidationResult>): void;
        getValidationResult(params: Params$Resource$Projects$Locations$Agents$Flows$Getvalidationresult, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FlowValidationResult>): void;
        getValidationResult(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FlowValidationResult>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.import({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "flowContent": "my_flowContent",
         *       //   "flowImportStrategy": {},
         *       //   "flowUri": "my_flowUri",
         *       //   "importOption": "my_importOption"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        import(params: Params$Resource$Projects$Locations$Agents$Flows$Import, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        import(params?: Params$Resource$Projects$Locations$Agents$Flows$Import, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        import(params: Params$Resource$Projects$Locations$Agents$Flows$Import, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        import(params: Params$Resource$Projects$Locations$Agents$Flows$Import, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        import(params: Params$Resource$Projects$Locations$Agents$Flows$Import, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        import(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.list({
         *     languageCode: 'placeholder-value',
         *
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "flows": [],
         *   //   "nextPageToken": "my_nextPageToken"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Flows$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Flows$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListFlowsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Flows$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Flows$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListFlowsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListFlowsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Flows$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListFlowsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListFlowsResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.patch({
         *     languageCode: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow',
         *
         *     updateMask: 'placeholder-value',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "advancedSettings": {},
         *       //   "description": "my_description",
         *       //   "displayName": "my_displayName",
         *       //   "eventHandlers": [],
         *       //   "inputParameterDefinitions": [],
         *       //   "knowledgeConnectorSettings": {},
         *       //   "locked": false,
         *       //   "multiLanguageSettings": {},
         *       //   "name": "my_name",
         *       //   "nluSettings": {},
         *       //   "outputParameterDefinitions": [],
         *       //   "transitionRouteGroups": [],
         *       //   "transitionRoutes": []
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "advancedSettings": {},
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "eventHandlers": [],
         *   //   "inputParameterDefinitions": [],
         *   //   "knowledgeConnectorSettings": {},
         *   //   "locked": false,
         *   //   "multiLanguageSettings": {},
         *   //   "name": "my_name",
         *   //   "nluSettings": {},
         *   //   "outputParameterDefinitions": [],
         *   //   "transitionRouteGroups": [],
         *   //   "transitionRoutes": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Flows$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Flow>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Flow>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Flow>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Flow>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Flow>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.train({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {}
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        train(params: Params$Resource$Projects$Locations$Agents$Flows$Train, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        train(params?: Params$Resource$Projects$Locations$Agents$Flows$Train, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        train(params: Params$Resource$Projects$Locations$Agents$Flows$Train, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        train(params: Params$Resource$Projects$Locations$Agents$Flows$Train, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        train(params: Params$Resource$Projects$Locations$Agents$Flows$Train, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        train(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.validate({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "languageCode": "my_languageCode"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "name": "my_name",
         *   //   "updateTime": "my_updateTime",
         *   //   "validationMessages": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        validate(params: Params$Resource$Projects$Locations$Agents$Flows$Validate, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        validate(params?: Params$Resource$Projects$Locations$Agents$Flows$Validate, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1FlowValidationResult>>;
        validate(params: Params$Resource$Projects$Locations$Agents$Flows$Validate, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        validate(params: Params$Resource$Projects$Locations$Agents$Flows$Validate, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FlowValidationResult>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FlowValidationResult>): void;
        validate(params: Params$Resource$Projects$Locations$Agents$Flows$Validate, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FlowValidationResult>): void;
        validate(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FlowValidationResult>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Create extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Flow;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Delete extends StandardParameters {
        /**
         *
         */
        force?: boolean;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Export extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ExportFlowRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Get extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Getvalidationresult extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Import extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ImportFlowRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$List extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Patch extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Flow;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Train extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1TrainFlowRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Validate extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ValidateFlowRequest;
    }
    export class Resource$Projects$Locations$Agents$Flows$Pages {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.pages.create({
         *     languageCode: 'placeholder-value',
         *
         *     parent:
         *       'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "advancedSettings": {},
         *       //   "description": "my_description",
         *       //   "displayName": "my_displayName",
         *       //   "entryFulfillment": {},
         *       //   "eventHandlers": [],
         *       //   "form": {},
         *       //   "knowledgeConnectorSettings": {},
         *       //   "name": "my_name",
         *       //   "transitionRouteGroups": [],
         *       //   "transitionRoutes": []
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "advancedSettings": {},
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "entryFulfillment": {},
         *   //   "eventHandlers": [],
         *   //   "form": {},
         *   //   "knowledgeConnectorSettings": {},
         *   //   "name": "my_name",
         *   //   "transitionRouteGroups": [],
         *   //   "transitionRoutes": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Flows$Pages$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Page>>;
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Page>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Page>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Page>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Page>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.pages.delete({
         *     force: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow/pages/my-page',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Flows$Pages$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.pages.get({
         *     languageCode: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow/pages/my-page',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "advancedSettings": {},
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "entryFulfillment": {},
         *   //   "eventHandlers": [],
         *   //   "form": {},
         *   //   "knowledgeConnectorSettings": {},
         *   //   "name": "my_name",
         *   //   "transitionRouteGroups": [],
         *   //   "transitionRoutes": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Flows$Pages$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Page>>;
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Page>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Page>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Page>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Page>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.pages.list({
         *     languageCode: 'placeholder-value',
         *
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent:
         *       'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "pages": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Flows$Pages$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListPagesResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListPagesResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListPagesResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListPagesResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListPagesResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.pages.patch({
         *     languageCode: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow/pages/my-page',
         *
         *     updateMask: 'placeholder-value',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "advancedSettings": {},
         *       //   "description": "my_description",
         *       //   "displayName": "my_displayName",
         *       //   "entryFulfillment": {},
         *       //   "eventHandlers": [],
         *       //   "form": {},
         *       //   "knowledgeConnectorSettings": {},
         *       //   "name": "my_name",
         *       //   "transitionRouteGroups": [],
         *       //   "transitionRoutes": []
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "advancedSettings": {},
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "entryFulfillment": {},
         *   //   "eventHandlers": [],
         *   //   "form": {},
         *   //   "knowledgeConnectorSettings": {},
         *   //   "name": "my_name",
         *   //   "transitionRouteGroups": [],
         *   //   "transitionRoutes": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Flows$Pages$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Page>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Page>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Page>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Pages$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Page>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Page>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Pages$Create extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Page;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Pages$Delete extends StandardParameters {
        /**
         *
         */
        force?: boolean;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Pages$Get extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Pages$List extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Pages$Patch extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Page;
    }
    export class Resource$Projects$Locations$Agents$Flows$Transitionroutegroups {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.flows.transitionRouteGroups.create(
         *       {
         *         languageCode: 'placeholder-value',
         *
         *         parent:
         *           'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow',
         *
         *         // Request body metadata
         *         requestBody: {
         *           // request body parameters
         *           // {
         *           //   "displayName": "my_displayName",
         *           //   "name": "my_name",
         *           //   "transitionRoutes": []
         *           // }
         *         },
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "displayName": "my_displayName",
         *   //   "name": "my_name",
         *   //   "transitionRoutes": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>>;
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.flows.transitionRouteGroups.delete(
         *       {
         *         force: 'placeholder-value',
         *
         *         name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow/transitionRouteGroups/my-transitionRouteGroup',
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.flows.transitionRouteGroups.get({
         *       languageCode: 'placeholder-value',
         *
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow/transitionRouteGroups/my-transitionRouteGroup',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "displayName": "my_displayName",
         *   //   "name": "my_name",
         *   //   "transitionRoutes": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>>;
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.flows.transitionRouteGroups.list(
         *       {
         *         languageCode: 'placeholder-value',
         *
         *         pageSize: 'placeholder-value',
         *
         *         pageToken: 'placeholder-value',
         *
         *         parent:
         *           'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow',
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "transitionRouteGroups": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListTransitionRouteGroupsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTransitionRouteGroupsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTransitionRouteGroupsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTransitionRouteGroupsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTransitionRouteGroupsResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.flows.transitionRouteGroups.patch(
         *       {
         *         languageCode: 'placeholder-value',
         *
         *         name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow/transitionRouteGroups/my-transitionRouteGroup',
         *
         *         updateMask: 'placeholder-value',
         *
         *         // Request body metadata
         *         requestBody: {
         *           // request body parameters
         *           // {
         *           //   "displayName": "my_displayName",
         *           //   "name": "my_name",
         *           //   "transitionRoutes": []
         *           // }
         *         },
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "displayName": "my_displayName",
         *   //   "name": "my_name",
         *   //   "transitionRoutes": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Create extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Delete extends StandardParameters {
        /**
         *
         */
        force?: boolean;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Get extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$List extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Transitionroutegroups$Patch extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup;
    }
    export class Resource$Projects$Locations$Agents$Flows$Versions {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.flows.versions.compareVersions({
         *       baseVersion:
         *         'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow/versions/my-version',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {
         *         //   "languageCode": "my_languageCode",
         *         //   "targetVersion": "my_targetVersion"
         *         // }
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "baseVersionContentJson": "my_baseVersionContentJson",
         *   //   "compareTime": "my_compareTime",
         *   //   "targetVersionContentJson": "my_targetVersionContentJson"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        compareVersions(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Compareversions, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        compareVersions(params?: Params$Resource$Projects$Locations$Agents$Flows$Versions$Compareversions, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1CompareVersionsResponse>>;
        compareVersions(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Compareversions, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        compareVersions(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Compareversions, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1CompareVersionsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1CompareVersionsResponse>): void;
        compareVersions(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Compareversions, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1CompareVersionsResponse>): void;
        compareVersions(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1CompareVersionsResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.versions.create({
         *     parent:
         *       'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "createTime": "my_createTime",
         *       //   "description": "my_description",
         *       //   "displayName": "my_displayName",
         *       //   "name": "my_name",
         *       //   "nluSettings": {},
         *       //   "state": "my_state"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Flows$Versions$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Create, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        create(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.versions.delete({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow/versions/my-version',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Flows$Versions$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.versions.get({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow/versions/my-version',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "createTime": "my_createTime",
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "name": "my_name",
         *   //   "nluSettings": {},
         *   //   "state": "my_state"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Flows$Versions$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Version>>;
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Version>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Version>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Version>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Version>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.versions.list({
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent:
         *       'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "versions": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Flows$Versions$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListVersionsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListVersionsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListVersionsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListVersionsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListVersionsResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.versions.load({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow/versions/my-version',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "allowOverrideAgentResources": false
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        load(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Load, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        load(params?: Params$Resource$Projects$Locations$Agents$Flows$Versions$Load, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        load(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Load, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        load(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Load, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        load(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Load, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        load(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.flows.versions.patch({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/flows/my-flow/versions/my-version',
         *
         *     updateMask: 'placeholder-value',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "createTime": "my_createTime",
         *       //   "description": "my_description",
         *       //   "displayName": "my_displayName",
         *       //   "name": "my_name",
         *       //   "nluSettings": {},
         *       //   "state": "my_state"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "createTime": "my_createTime",
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "name": "my_name",
         *   //   "nluSettings": {},
         *   //   "state": "my_state"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Flows$Versions$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Version>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Version>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Version>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Flows$Versions$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Version>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Version>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Versions$Compareversions extends StandardParameters {
        /**
         *
         */
        baseVersion?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1CompareVersionsRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Versions$Create extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Version;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Versions$Delete extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Versions$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Versions$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Versions$Load extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1LoadVersionRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Flows$Versions$Patch extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Version;
    }
    export class Resource$Projects$Locations$Agents$Generators {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.generators.create({
         *     languageCode: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "displayName": "my_displayName",
         *       //   "llmModelSettings": {},
         *       //   "modelParameter": {},
         *       //   "name": "my_name",
         *       //   "placeholders": [],
         *       //   "promptText": {}
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "displayName": "my_displayName",
         *   //   "llmModelSettings": {},
         *   //   "modelParameter": {},
         *   //   "name": "my_name",
         *   //   "placeholders": [],
         *   //   "promptText": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Generators$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Generators$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Generator>>;
        create(params: Params$Resource$Projects$Locations$Agents$Generators$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Generators$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Generator>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Generator>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Generators$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Generator>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Generator>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.generators.delete({
         *     force: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/generators/my-generator',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Generators$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Generators$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Generators$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Generators$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Generators$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.generators.get({
         *     languageCode: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/generators/my-generator',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "displayName": "my_displayName",
         *   //   "llmModelSettings": {},
         *   //   "modelParameter": {},
         *   //   "name": "my_name",
         *   //   "placeholders": [],
         *   //   "promptText": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Generators$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Generators$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Generator>>;
        get(params: Params$Resource$Projects$Locations$Agents$Generators$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Generators$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Generator>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Generator>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Generators$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Generator>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Generator>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.generators.list({
         *     languageCode: 'placeholder-value',
         *
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "generators": [],
         *   //   "nextPageToken": "my_nextPageToken"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Generators$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Generators$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListGeneratorsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Generators$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Generators$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListGeneratorsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListGeneratorsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Generators$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListGeneratorsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListGeneratorsResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.generators.patch({
         *     languageCode: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/generators/my-generator',
         *
         *     updateMask: 'placeholder-value',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "displayName": "my_displayName",
         *       //   "llmModelSettings": {},
         *       //   "modelParameter": {},
         *       //   "name": "my_name",
         *       //   "placeholders": [],
         *       //   "promptText": {}
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "displayName": "my_displayName",
         *   //   "llmModelSettings": {},
         *   //   "modelParameter": {},
         *   //   "name": "my_name",
         *   //   "placeholders": [],
         *   //   "promptText": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Generators$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Generators$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Generator>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Generators$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Generators$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Generator>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Generator>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Generators$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Generator>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Generator>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Generators$Create extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Generator;
    }
    export interface Params$Resource$Projects$Locations$Agents$Generators$Delete extends StandardParameters {
        /**
         *
         */
        force?: boolean;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Generators$Get extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Generators$List extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Generators$Patch extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Generator;
    }
    export class Resource$Projects$Locations$Agents$Intents {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.intents.create({
         *     languageCode: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "description": "my_description",
         *       //   "displayName": "my_displayName",
         *       //   "dtmfPattern": "my_dtmfPattern",
         *       //   "isFallback": false,
         *       //   "labels": {},
         *       //   "name": "my_name",
         *       //   "parameters": [],
         *       //   "priority": 0,
         *       //   "trainingPhrases": []
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "dtmfPattern": "my_dtmfPattern",
         *   //   "isFallback": false,
         *   //   "labels": {},
         *   //   "name": "my_name",
         *   //   "parameters": [],
         *   //   "priority": 0,
         *   //   "trainingPhrases": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Intents$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Intents$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Intent>>;
        create(params: Params$Resource$Projects$Locations$Agents$Intents$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Intents$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Intent>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Intent>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Intents$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Intent>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Intent>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.intents.delete({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/intents/my-intent',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Intents$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Intents$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Intents$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Intents$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Intents$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.intents.export({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "dataFormat": "my_dataFormat",
         *       //   "intents": [],
         *       //   "intentsContentInline": false,
         *       //   "intentsUri": "my_intentsUri"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        export(params: Params$Resource$Projects$Locations$Agents$Intents$Export, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        export(params?: Params$Resource$Projects$Locations$Agents$Intents$Export, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        export(params: Params$Resource$Projects$Locations$Agents$Intents$Export, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        export(params: Params$Resource$Projects$Locations$Agents$Intents$Export, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        export(params: Params$Resource$Projects$Locations$Agents$Intents$Export, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        export(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.intents.get({
         *     languageCode: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/intents/my-intent',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "dtmfPattern": "my_dtmfPattern",
         *   //   "isFallback": false,
         *   //   "labels": {},
         *   //   "name": "my_name",
         *   //   "parameters": [],
         *   //   "priority": 0,
         *   //   "trainingPhrases": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Intents$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Intents$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Intent>>;
        get(params: Params$Resource$Projects$Locations$Agents$Intents$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Intents$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Intent>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Intent>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Intents$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Intent>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Intent>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.intents.import({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "intentsContent": {},
         *       //   "intentsUri": "my_intentsUri",
         *       //   "mergeOption": "my_mergeOption"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        import(params: Params$Resource$Projects$Locations$Agents$Intents$Import, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        import(params?: Params$Resource$Projects$Locations$Agents$Intents$Import, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        import(params: Params$Resource$Projects$Locations$Agents$Intents$Import, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        import(params: Params$Resource$Projects$Locations$Agents$Intents$Import, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        import(params: Params$Resource$Projects$Locations$Agents$Intents$Import, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        import(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.intents.list({
         *     intentView: 'placeholder-value',
         *
         *     languageCode: 'placeholder-value',
         *
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "intents": [],
         *   //   "nextPageToken": "my_nextPageToken"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Intents$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Intents$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListIntentsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Intents$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Intents$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListIntentsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListIntentsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Intents$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListIntentsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListIntentsResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.intents.patch({
         *     languageCode: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/intents/my-intent',
         *
         *     updateMask: 'placeholder-value',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "description": "my_description",
         *       //   "displayName": "my_displayName",
         *       //   "dtmfPattern": "my_dtmfPattern",
         *       //   "isFallback": false,
         *       //   "labels": {},
         *       //   "name": "my_name",
         *       //   "parameters": [],
         *       //   "priority": 0,
         *       //   "trainingPhrases": []
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "dtmfPattern": "my_dtmfPattern",
         *   //   "isFallback": false,
         *   //   "labels": {},
         *   //   "name": "my_name",
         *   //   "parameters": [],
         *   //   "priority": 0,
         *   //   "trainingPhrases": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Intents$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Intents$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Intent>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Intents$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Intents$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Intent>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Intent>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Intents$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Intent>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Intent>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Intents$Create extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Intent;
    }
    export interface Params$Resource$Projects$Locations$Agents$Intents$Delete extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Intents$Export extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ExportIntentsRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Intents$Get extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Intents$Import extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ImportIntentsRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Intents$List extends StandardParameters {
        /**
         *
         */
        intentView?: string;
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Intents$Patch extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Intent;
    }
    export class Resource$Projects$Locations$Agents$Playbooks {
        context: APIRequestContext;
        examples: Resource$Projects$Locations$Agents$Playbooks$Examples;
        versions: Resource$Projects$Locations$Agents$Playbooks$Versions;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.playbooks.create({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "codeBlock": {},
         *       //   "createTime": "my_createTime",
         *       //   "displayName": "my_displayName",
         *       //   "goal": "my_goal",
         *       //   "handlers": [],
         *       //   "inlineActions": [],
         *       //   "inputParameterDefinitions": [],
         *       //   "instruction": {},
         *       //   "llmModelSettings": {},
         *       //   "name": "my_name",
         *       //   "outputParameterDefinitions": [],
         *       //   "playbookType": "my_playbookType",
         *       //   "referencedFlows": [],
         *       //   "referencedPlaybooks": [],
         *       //   "referencedTools": [],
         *       //   "speechSettings": {},
         *       //   "tokenCount": "my_tokenCount",
         *       //   "updateTime": "my_updateTime"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "codeBlock": {},
         *   //   "createTime": "my_createTime",
         *   //   "displayName": "my_displayName",
         *   //   "goal": "my_goal",
         *   //   "handlers": [],
         *   //   "inlineActions": [],
         *   //   "inputParameterDefinitions": [],
         *   //   "instruction": {},
         *   //   "llmModelSettings": {},
         *   //   "name": "my_name",
         *   //   "outputParameterDefinitions": [],
         *   //   "playbookType": "my_playbookType",
         *   //   "referencedFlows": [],
         *   //   "referencedPlaybooks": [],
         *   //   "referencedTools": [],
         *   //   "speechSettings": {},
         *   //   "tokenCount": "my_tokenCount",
         *   //   "updateTime": "my_updateTime"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Playbooks$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Playbook>>;
        create(params: Params$Resource$Projects$Locations$Agents$Playbooks$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Playbooks$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Playbook>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Playbook>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Playbooks$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Playbook>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Playbook>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.playbooks.delete({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/playbooks/my-playbook',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Playbooks$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Playbooks$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Playbooks$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Playbooks$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.playbooks.export({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/playbooks/my-playbook',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "dataFormat": "my_dataFormat",
         *       //   "playbookUri": "my_playbookUri"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        export(params: Params$Resource$Projects$Locations$Agents$Playbooks$Export, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        export(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Export, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        export(params: Params$Resource$Projects$Locations$Agents$Playbooks$Export, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        export(params: Params$Resource$Projects$Locations$Agents$Playbooks$Export, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        export(params: Params$Resource$Projects$Locations$Agents$Playbooks$Export, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        export(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.playbooks.get({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/playbooks/my-playbook',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "codeBlock": {},
         *   //   "createTime": "my_createTime",
         *   //   "displayName": "my_displayName",
         *   //   "goal": "my_goal",
         *   //   "handlers": [],
         *   //   "inlineActions": [],
         *   //   "inputParameterDefinitions": [],
         *   //   "instruction": {},
         *   //   "llmModelSettings": {},
         *   //   "name": "my_name",
         *   //   "outputParameterDefinitions": [],
         *   //   "playbookType": "my_playbookType",
         *   //   "referencedFlows": [],
         *   //   "referencedPlaybooks": [],
         *   //   "referencedTools": [],
         *   //   "speechSettings": {},
         *   //   "tokenCount": "my_tokenCount",
         *   //   "updateTime": "my_updateTime"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Playbooks$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Playbook>>;
        get(params: Params$Resource$Projects$Locations$Agents$Playbooks$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Playbooks$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Playbook>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Playbook>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Playbooks$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Playbook>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Playbook>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.playbooks.import({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "importStrategy": {},
         *       //   "playbookContent": "my_playbookContent",
         *       //   "playbookUri": "my_playbookUri"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        import(params: Params$Resource$Projects$Locations$Agents$Playbooks$Import, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        import(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Import, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        import(params: Params$Resource$Projects$Locations$Agents$Playbooks$Import, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        import(params: Params$Resource$Projects$Locations$Agents$Playbooks$Import, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        import(params: Params$Resource$Projects$Locations$Agents$Playbooks$Import, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        import(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.playbooks.list({
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "playbooks": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Playbooks$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Playbooks$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListPlaybooksResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Playbooks$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Playbooks$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListPlaybooksResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListPlaybooksResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Playbooks$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListPlaybooksResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListPlaybooksResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.playbooks.patch({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/playbooks/my-playbook',
         *
         *     updateMask: 'placeholder-value',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "codeBlock": {},
         *       //   "createTime": "my_createTime",
         *       //   "displayName": "my_displayName",
         *       //   "goal": "my_goal",
         *       //   "handlers": [],
         *       //   "inlineActions": [],
         *       //   "inputParameterDefinitions": [],
         *       //   "instruction": {},
         *       //   "llmModelSettings": {},
         *       //   "name": "my_name",
         *       //   "outputParameterDefinitions": [],
         *       //   "playbookType": "my_playbookType",
         *       //   "referencedFlows": [],
         *       //   "referencedPlaybooks": [],
         *       //   "referencedTools": [],
         *       //   "speechSettings": {},
         *       //   "tokenCount": "my_tokenCount",
         *       //   "updateTime": "my_updateTime"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "codeBlock": {},
         *   //   "createTime": "my_createTime",
         *   //   "displayName": "my_displayName",
         *   //   "goal": "my_goal",
         *   //   "handlers": [],
         *   //   "inlineActions": [],
         *   //   "inputParameterDefinitions": [],
         *   //   "instruction": {},
         *   //   "llmModelSettings": {},
         *   //   "name": "my_name",
         *   //   "outputParameterDefinitions": [],
         *   //   "playbookType": "my_playbookType",
         *   //   "referencedFlows": [],
         *   //   "referencedPlaybooks": [],
         *   //   "referencedTools": [],
         *   //   "speechSettings": {},
         *   //   "tokenCount": "my_tokenCount",
         *   //   "updateTime": "my_updateTime"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Playbooks$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Playbook>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Playbooks$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Playbooks$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Playbook>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Playbook>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Playbooks$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Playbook>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Playbook>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Create extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Playbook;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Delete extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Export extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ExportPlaybookRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Import extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ImportPlaybookRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Patch extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Playbook;
    }
    export class Resource$Projects$Locations$Agents$Playbooks$Examples {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.playbooks.examples.create({
         *       parent:
         *         'projects/my-project/locations/my-location/agents/my-agent/playbooks/my-playbook',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {
         *         //   "actions": [],
         *         //   "conversationState": "my_conversationState",
         *         //   "createTime": "my_createTime",
         *         //   "description": "my_description",
         *         //   "displayName": "my_displayName",
         *         //   "languageCode": "my_languageCode",
         *         //   "name": "my_name",
         *         //   "playbookInput": {},
         *         //   "playbookOutput": {},
         *         //   "tokenCount": "my_tokenCount",
         *         //   "updateTime": "my_updateTime"
         *         // }
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "actions": [],
         *   //   "conversationState": "my_conversationState",
         *   //   "createTime": "my_createTime",
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "languageCode": "my_languageCode",
         *   //   "name": "my_name",
         *   //   "playbookInput": {},
         *   //   "playbookOutput": {},
         *   //   "tokenCount": "my_tokenCount",
         *   //   "updateTime": "my_updateTime"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Example>>;
        create(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Example>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Example>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Example>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Example>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.playbooks.examples.delete({
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/playbooks/my-playbook/examples/my-example',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.playbooks.examples.get(
         *     {
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/playbooks/my-playbook/examples/my-example',
         *     },
         *   );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "actions": [],
         *   //   "conversationState": "my_conversationState",
         *   //   "createTime": "my_createTime",
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "languageCode": "my_languageCode",
         *   //   "name": "my_name",
         *   //   "playbookInput": {},
         *   //   "playbookOutput": {},
         *   //   "tokenCount": "my_tokenCount",
         *   //   "updateTime": "my_updateTime"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Example>>;
        get(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Example>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Example>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Example>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Example>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.playbooks.examples.list({
         *       languageCode: 'placeholder-value',
         *
         *       pageSize: 'placeholder-value',
         *
         *       pageToken: 'placeholder-value',
         *
         *       parent:
         *         'projects/my-project/locations/my-location/agents/my-agent/playbooks/my-playbook',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "examples": [],
         *   //   "nextPageToken": "my_nextPageToken"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListExamplesResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListExamplesResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListExamplesResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListExamplesResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListExamplesResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.playbooks.examples.patch({
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/playbooks/my-playbook/examples/my-example',
         *
         *       updateMask: 'placeholder-value',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {
         *         //   "actions": [],
         *         //   "conversationState": "my_conversationState",
         *         //   "createTime": "my_createTime",
         *         //   "description": "my_description",
         *         //   "displayName": "my_displayName",
         *         //   "languageCode": "my_languageCode",
         *         //   "name": "my_name",
         *         //   "playbookInput": {},
         *         //   "playbookOutput": {},
         *         //   "tokenCount": "my_tokenCount",
         *         //   "updateTime": "my_updateTime"
         *         // }
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "actions": [],
         *   //   "conversationState": "my_conversationState",
         *   //   "createTime": "my_createTime",
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "languageCode": "my_languageCode",
         *   //   "name": "my_name",
         *   //   "playbookInput": {},
         *   //   "playbookOutput": {},
         *   //   "tokenCount": "my_tokenCount",
         *   //   "updateTime": "my_updateTime"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Example>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Example>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Example>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Example>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Example>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Create extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Example;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Delete extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Examples$List extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Examples$Patch extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Example;
    }
    export class Resource$Projects$Locations$Agents$Playbooks$Versions {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.playbooks.versions.create({
         *       parent:
         *         'projects/my-project/locations/my-location/agents/my-agent/playbooks/my-playbook',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {
         *         //   "description": "my_description",
         *         //   "examples": [],
         *         //   "name": "my_name",
         *         //   "playbook": {},
         *         //   "updateTime": "my_updateTime"
         *         // }
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "description": "my_description",
         *   //   "examples": [],
         *   //   "name": "my_name",
         *   //   "playbook": {},
         *   //   "updateTime": "my_updateTime"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1PlaybookVersion>>;
        create(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1PlaybookVersion>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1PlaybookVersion>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1PlaybookVersion>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1PlaybookVersion>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.playbooks.versions.delete({
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/playbooks/my-playbook/versions/my-version',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.playbooks.versions.get(
         *     {
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/playbooks/my-playbook/versions/my-version',
         *     },
         *   );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "description": "my_description",
         *   //   "examples": [],
         *   //   "name": "my_name",
         *   //   "playbook": {},
         *   //   "updateTime": "my_updateTime"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1PlaybookVersion>>;
        get(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1PlaybookVersion>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1PlaybookVersion>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1PlaybookVersion>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1PlaybookVersion>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.playbooks.versions.list({
         *       pageSize: 'placeholder-value',
         *
         *       pageToken: 'placeholder-value',
         *
         *       parent:
         *         'projects/my-project/locations/my-location/agents/my-agent/playbooks/my-playbook',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "playbookVersions": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListPlaybookVersionsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListPlaybookVersionsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListPlaybookVersionsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListPlaybookVersionsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListPlaybookVersionsResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.playbooks.versions.restore({
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/playbooks/my-playbook/versions/my-version',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {}
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "playbook": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        restore(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Restore, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        restore(params?: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Restore, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1RestorePlaybookVersionResponse>>;
        restore(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Restore, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        restore(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Restore, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1RestorePlaybookVersionResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1RestorePlaybookVersionResponse>): void;
        restore(params: Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Restore, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1RestorePlaybookVersionResponse>): void;
        restore(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1RestorePlaybookVersionResponse>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Create extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1PlaybookVersion;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Delete extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Versions$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Playbooks$Versions$Restore extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1RestorePlaybookVersionRequest;
    }
    export class Resource$Projects$Locations$Agents$Sessions {
        context: APIRequestContext;
        entityTypes: Resource$Projects$Locations$Agents$Sessions$Entitytypes;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.sessions.detectIntent({
         *     session:
         *       'projects/my-project/locations/my-location/agents/my-agent/sessions/my-session',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "outputAudioConfig": {},
         *       //   "queryInput": {},
         *       //   "queryParams": {},
         *       //   "responseView": "my_responseView",
         *       //   "session": "my_session"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "allowCancellation": false,
         *   //   "outputAudio": "my_outputAudio",
         *   //   "outputAudioConfig": {},
         *   //   "queryResult": {},
         *   //   "responseId": "my_responseId",
         *   //   "responseType": "my_responseType"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        detectIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Detectintent, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        detectIntent(params?: Params$Resource$Projects$Locations$Agents$Sessions$Detectintent, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>>;
        detectIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Detectintent, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        detectIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Detectintent, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>): void;
        detectIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Detectintent, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>): void;
        detectIntent(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.sessions.fulfillIntent(
         *     {
         *       session:
         *         'projects/my-project/locations/my-location/agents/my-agent/sessions/my-session',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {
         *         //   "match": {},
         *         //   "matchIntentRequest": {},
         *         //   "outputAudioConfig": {}
         *         // }
         *       },
         *     },
         *   );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "outputAudio": "my_outputAudio",
         *   //   "outputAudioConfig": {},
         *   //   "queryResult": {},
         *   //   "responseId": "my_responseId"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        fulfillIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Fulfillintent, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        fulfillIntent(params?: Params$Resource$Projects$Locations$Agents$Sessions$Fulfillintent, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1FulfillIntentResponse>>;
        fulfillIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Fulfillintent, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        fulfillIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Fulfillintent, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FulfillIntentResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FulfillIntentResponse>): void;
        fulfillIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Fulfillintent, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FulfillIntentResponse>): void;
        fulfillIntent(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1FulfillIntentResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.sessions.matchIntent({
         *     session:
         *       'projects/my-project/locations/my-location/agents/my-agent/sessions/my-session',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "persistParameterChanges": false,
         *       //   "queryInput": {},
         *       //   "queryParams": {}
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "currentPage": {},
         *   //   "matches": [],
         *   //   "text": "my_text",
         *   //   "transcript": "my_transcript",
         *   //   "triggerEvent": "my_triggerEvent",
         *   //   "triggerIntent": "my_triggerIntent"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        matchIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Matchintent, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        matchIntent(params?: Params$Resource$Projects$Locations$Agents$Sessions$Matchintent, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1MatchIntentResponse>>;
        matchIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Matchintent, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        matchIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Matchintent, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1MatchIntentResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1MatchIntentResponse>): void;
        matchIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Matchintent, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1MatchIntentResponse>): void;
        matchIntent(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1MatchIntentResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.sessions.serverStreamingDetectIntent(
         *       {
         *         session:
         *           'projects/my-project/locations/my-location/agents/my-agent/sessions/my-session',
         *
         *         // Request body metadata
         *         requestBody: {
         *           // request body parameters
         *           // {
         *           //   "outputAudioConfig": {},
         *           //   "queryInput": {},
         *           //   "queryParams": {},
         *           //   "responseView": "my_responseView",
         *           //   "session": "my_session"
         *           // }
         *         },
         *       },
         *     );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "allowCancellation": false,
         *   //   "outputAudio": "my_outputAudio",
         *   //   "outputAudioConfig": {},
         *   //   "queryResult": {},
         *   //   "responseId": "my_responseId",
         *   //   "responseType": "my_responseType"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        serverStreamingDetectIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Serverstreamingdetectintent, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        serverStreamingDetectIntent(params?: Params$Resource$Projects$Locations$Agents$Sessions$Serverstreamingdetectintent, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>>;
        serverStreamingDetectIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Serverstreamingdetectintent, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        serverStreamingDetectIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Serverstreamingdetectintent, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>): void;
        serverStreamingDetectIntent(params: Params$Resource$Projects$Locations$Agents$Sessions$Serverstreamingdetectintent, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>): void;
        serverStreamingDetectIntent(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1DetectIntentResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.sessions.submitAnswerFeedback({
         *       session:
         *         'projects/my-project/locations/my-location/agents/my-agent/sessions/my-session',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {
         *         //   "answerFeedback": {},
         *         //   "responseId": "my_responseId",
         *         //   "updateMask": "my_updateMask"
         *         // }
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "customRating": "my_customRating",
         *   //   "rating": "my_rating",
         *   //   "ratingReason": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        submitAnswerFeedback(params: Params$Resource$Projects$Locations$Agents$Sessions$Submitanswerfeedback, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        submitAnswerFeedback(params?: Params$Resource$Projects$Locations$Agents$Sessions$Submitanswerfeedback, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1AnswerFeedback>>;
        submitAnswerFeedback(params: Params$Resource$Projects$Locations$Agents$Sessions$Submitanswerfeedback, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        submitAnswerFeedback(params: Params$Resource$Projects$Locations$Agents$Sessions$Submitanswerfeedback, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1AnswerFeedback>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1AnswerFeedback>): void;
        submitAnswerFeedback(params: Params$Resource$Projects$Locations$Agents$Sessions$Submitanswerfeedback, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1AnswerFeedback>): void;
        submitAnswerFeedback(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1AnswerFeedback>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Sessions$Detectintent extends StandardParameters {
        /**
         *
         */
        session?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1DetectIntentRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Sessions$Fulfillintent extends StandardParameters {
        /**
         *
         */
        session?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1FulfillIntentRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Sessions$Matchintent extends StandardParameters {
        /**
         *
         */
        session?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1MatchIntentRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Sessions$Serverstreamingdetectintent extends StandardParameters {
        /**
         *
         */
        session?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1DetectIntentRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Sessions$Submitanswerfeedback extends StandardParameters {
        /**
         *
         */
        session?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1SubmitAnswerFeedbackRequest;
    }
    export class Resource$Projects$Locations$Agents$Sessions$Entitytypes {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.sessions.entityTypes.create({
         *       parent:
         *         'projects/my-project/locations/my-location/agents/my-agent/sessions/my-session',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {
         *         //   "entities": [],
         *         //   "entityOverrideMode": "my_entityOverrideMode",
         *         //   "name": "my_name"
         *         // }
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "entities": [],
         *   //   "entityOverrideMode": "my_entityOverrideMode",
         *   //   "name": "my_name"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>>;
        create(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.sessions.entityTypes.delete({
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/sessions/my-session/entityTypes/my-entityType',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.sessions.entityTypes.get({
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/sessions/my-session/entityTypes/my-entityType',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "entities": [],
         *   //   "entityOverrideMode": "my_entityOverrideMode",
         *   //   "name": "my_name"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>>;
        get(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.sessions.entityTypes.list({
         *       pageSize: 'placeholder-value',
         *
         *       pageToken: 'placeholder-value',
         *
         *       parent:
         *         'projects/my-project/locations/my-location/agents/my-agent/sessions/my-session',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "sessionEntityTypes": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListSessionEntityTypesResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListSessionEntityTypesResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListSessionEntityTypesResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListSessionEntityTypesResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListSessionEntityTypesResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.sessions.entityTypes.patch({
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/sessions/my-session/entityTypes/my-entityType',
         *
         *       updateMask: 'placeholder-value',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {
         *         //   "entities": [],
         *         //   "entityOverrideMode": "my_entityOverrideMode",
         *         //   "name": "my_name"
         *         // }
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "entities": [],
         *   //   "entityOverrideMode": "my_entityOverrideMode",
         *   //   "name": "my_name"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Create extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType;
    }
    export interface Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Delete extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Sessions$Entitytypes$Patch extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1SessionEntityType;
    }
    export class Resource$Projects$Locations$Agents$Testcases {
        context: APIRequestContext;
        results: Resource$Projects$Locations$Agents$Testcases$Results;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.testCases.batchDelete({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "names": []
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        batchDelete(params: Params$Resource$Projects$Locations$Agents$Testcases$Batchdelete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        batchDelete(params?: Params$Resource$Projects$Locations$Agents$Testcases$Batchdelete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        batchDelete(params: Params$Resource$Projects$Locations$Agents$Testcases$Batchdelete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        batchDelete(params: Params$Resource$Projects$Locations$Agents$Testcases$Batchdelete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        batchDelete(params: Params$Resource$Projects$Locations$Agents$Testcases$Batchdelete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        batchDelete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.testCases.batchRun({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "environment": "my_environment",
         *       //   "testCases": []
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        batchRun(params: Params$Resource$Projects$Locations$Agents$Testcases$Batchrun, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        batchRun(params?: Params$Resource$Projects$Locations$Agents$Testcases$Batchrun, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        batchRun(params: Params$Resource$Projects$Locations$Agents$Testcases$Batchrun, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        batchRun(params: Params$Resource$Projects$Locations$Agents$Testcases$Batchrun, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        batchRun(params: Params$Resource$Projects$Locations$Agents$Testcases$Batchrun, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        batchRun(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.testCases.calculateCoverage({
         *       agent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *       type: 'placeholder-value',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "agent": "my_agent",
         *   //   "intentCoverage": {},
         *   //   "routeGroupCoverage": {},
         *   //   "transitionCoverage": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        calculateCoverage(params: Params$Resource$Projects$Locations$Agents$Testcases$Calculatecoverage, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        calculateCoverage(params?: Params$Resource$Projects$Locations$Agents$Testcases$Calculatecoverage, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1CalculateCoverageResponse>>;
        calculateCoverage(params: Params$Resource$Projects$Locations$Agents$Testcases$Calculatecoverage, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        calculateCoverage(params: Params$Resource$Projects$Locations$Agents$Testcases$Calculatecoverage, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1CalculateCoverageResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1CalculateCoverageResponse>): void;
        calculateCoverage(params: Params$Resource$Projects$Locations$Agents$Testcases$Calculatecoverage, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1CalculateCoverageResponse>): void;
        calculateCoverage(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1CalculateCoverageResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.testCases.create({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "creationTime": "my_creationTime",
         *       //   "displayName": "my_displayName",
         *       //   "lastTestResult": {},
         *       //   "name": "my_name",
         *       //   "notes": "my_notes",
         *       //   "tags": [],
         *       //   "testCaseConversationTurns": [],
         *       //   "testConfig": {}
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "creationTime": "my_creationTime",
         *   //   "displayName": "my_displayName",
         *   //   "lastTestResult": {},
         *   //   "name": "my_name",
         *   //   "notes": "my_notes",
         *   //   "tags": [],
         *   //   "testCaseConversationTurns": [],
         *   //   "testConfig": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Testcases$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Testcases$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1TestCase>>;
        create(params: Params$Resource$Projects$Locations$Agents$Testcases$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Testcases$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCase>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCase>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Testcases$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCase>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCase>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.testCases.export({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "dataFormat": "my_dataFormat",
         *       //   "filter": "my_filter",
         *       //   "gcsUri": "my_gcsUri"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        export(params: Params$Resource$Projects$Locations$Agents$Testcases$Export, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        export(params?: Params$Resource$Projects$Locations$Agents$Testcases$Export, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        export(params: Params$Resource$Projects$Locations$Agents$Testcases$Export, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        export(params: Params$Resource$Projects$Locations$Agents$Testcases$Export, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        export(params: Params$Resource$Projects$Locations$Agents$Testcases$Export, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        export(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.testCases.get({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/testCases/my-testCase',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "creationTime": "my_creationTime",
         *   //   "displayName": "my_displayName",
         *   //   "lastTestResult": {},
         *   //   "name": "my_name",
         *   //   "notes": "my_notes",
         *   //   "tags": [],
         *   //   "testCaseConversationTurns": [],
         *   //   "testConfig": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Testcases$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Testcases$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1TestCase>>;
        get(params: Params$Resource$Projects$Locations$Agents$Testcases$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Testcases$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCase>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCase>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Testcases$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCase>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCase>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.testCases.import({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "content": "my_content",
         *       //   "gcsUri": "my_gcsUri"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        import(params: Params$Resource$Projects$Locations$Agents$Testcases$Import, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        import(params?: Params$Resource$Projects$Locations$Agents$Testcases$Import, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        import(params: Params$Resource$Projects$Locations$Agents$Testcases$Import, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        import(params: Params$Resource$Projects$Locations$Agents$Testcases$Import, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        import(params: Params$Resource$Projects$Locations$Agents$Testcases$Import, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        import(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.testCases.list({
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     view: 'placeholder-value',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "testCases": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Testcases$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Testcases$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListTestCasesResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Testcases$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Testcases$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTestCasesResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTestCasesResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Testcases$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTestCasesResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTestCasesResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.testCases.patch({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/testCases/my-testCase',
         *
         *     updateMask: 'placeholder-value',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "creationTime": "my_creationTime",
         *       //   "displayName": "my_displayName",
         *       //   "lastTestResult": {},
         *       //   "name": "my_name",
         *       //   "notes": "my_notes",
         *       //   "tags": [],
         *       //   "testCaseConversationTurns": [],
         *       //   "testConfig": {}
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "creationTime": "my_creationTime",
         *   //   "displayName": "my_displayName",
         *   //   "lastTestResult": {},
         *   //   "name": "my_name",
         *   //   "notes": "my_notes",
         *   //   "tags": [],
         *   //   "testCaseConversationTurns": [],
         *   //   "testConfig": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Testcases$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Testcases$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1TestCase>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Testcases$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Testcases$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCase>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCase>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Testcases$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCase>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCase>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.testCases.run({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/testCases/my-testCase',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "environment": "my_environment"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        run(params: Params$Resource$Projects$Locations$Agents$Testcases$Run, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        run(params?: Params$Resource$Projects$Locations$Agents$Testcases$Run, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        run(params: Params$Resource$Projects$Locations$Agents$Testcases$Run, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        run(params: Params$Resource$Projects$Locations$Agents$Testcases$Run, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        run(params: Params$Resource$Projects$Locations$Agents$Testcases$Run, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        run(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Testcases$Batchdelete extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1BatchDeleteTestCasesRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Testcases$Batchrun extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1BatchRunTestCasesRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Testcases$Calculatecoverage extends StandardParameters {
        /**
         *
         */
        agent?: string;
        /**
         *
         */
        type?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Testcases$Create extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1TestCase;
    }
    export interface Params$Resource$Projects$Locations$Agents$Testcases$Export extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ExportTestCasesRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Testcases$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Testcases$Import extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ImportTestCasesRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Testcases$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
        /**
         *
         */
        view?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Testcases$Patch extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1TestCase;
    }
    export interface Params$Resource$Projects$Locations$Agents$Testcases$Run extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1RunTestCaseRequest;
    }
    export class Resource$Projects$Locations$Agents$Testcases$Results {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.testCases.results.get({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/testCases/my-testCase/results/my-result',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "conversationTurns": [],
         *   //   "environment": "my_environment",
         *   //   "name": "my_name",
         *   //   "testResult": "my_testResult",
         *   //   "testTime": "my_testTime"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Testcases$Results$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Testcases$Results$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1TestCaseResult>>;
        get(params: Params$Resource$Projects$Locations$Agents$Testcases$Results$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Testcases$Results$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCaseResult>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCaseResult>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Testcases$Results$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCaseResult>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TestCaseResult>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.testCases.results.list(
         *     {
         *       filter: 'placeholder-value',
         *
         *       pageSize: 'placeholder-value',
         *
         *       pageToken: 'placeholder-value',
         *
         *       parent:
         *         'projects/my-project/locations/my-location/agents/my-agent/testCases/my-testCase',
         *     },
         *   );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "testCaseResults": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Testcases$Results$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Testcases$Results$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListTestCaseResultsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Testcases$Results$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Testcases$Results$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTestCaseResultsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTestCaseResultsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Testcases$Results$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTestCaseResultsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTestCaseResultsResponse>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Testcases$Results$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Testcases$Results$List extends StandardParameters {
        /**
         *
         */
        filter?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export class Resource$Projects$Locations$Agents$Tools {
        context: APIRequestContext;
        versions: Resource$Projects$Locations$Agents$Tools$Versions;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.tools.create({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "connectorSpec": {},
         *       //   "dataStoreSpec": {},
         *       //   "description": "my_description",
         *       //   "displayName": "my_displayName",
         *       //   "extensionSpec": {},
         *       //   "functionSpec": {},
         *       //   "name": "my_name",
         *       //   "openApiSpec": {},
         *       //   "toolType": "my_toolType"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "connectorSpec": {},
         *   //   "dataStoreSpec": {},
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "extensionSpec": {},
         *   //   "functionSpec": {},
         *   //   "name": "my_name",
         *   //   "openApiSpec": {},
         *   //   "toolType": "my_toolType"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Tools$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Tools$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Tool>>;
        create(params: Params$Resource$Projects$Locations$Agents$Tools$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Tools$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Tool>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Tool>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Tools$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Tool>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Tool>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.tools.delete({
         *     force: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/tools/my-tool',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Tools$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Tools$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Tools$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Tools$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Tools$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.tools.export({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "dataFormat": "my_dataFormat",
         *       //   "tools": [],
         *       //   "toolsContentInline": false,
         *       //   "toolsUri": "my_toolsUri"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        export(params: Params$Resource$Projects$Locations$Agents$Tools$Export, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        export(params?: Params$Resource$Projects$Locations$Agents$Tools$Export, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        export(params: Params$Resource$Projects$Locations$Agents$Tools$Export, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        export(params: Params$Resource$Projects$Locations$Agents$Tools$Export, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        export(params: Params$Resource$Projects$Locations$Agents$Tools$Export, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        export(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.tools.get({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/tools/my-tool',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "connectorSpec": {},
         *   //   "dataStoreSpec": {},
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "extensionSpec": {},
         *   //   "functionSpec": {},
         *   //   "name": "my_name",
         *   //   "openApiSpec": {},
         *   //   "toolType": "my_toolType"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Tools$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Tools$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Tool>>;
        get(params: Params$Resource$Projects$Locations$Agents$Tools$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Tools$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Tool>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Tool>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Tools$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Tool>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Tool>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.tools.list({
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "tools": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Tools$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Tools$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListToolsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Tools$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Tools$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListToolsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListToolsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Tools$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListToolsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListToolsResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.tools.patch({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/tools/my-tool',
         *
         *     updateMask: 'placeholder-value',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "connectorSpec": {},
         *       //   "dataStoreSpec": {},
         *       //   "description": "my_description",
         *       //   "displayName": "my_displayName",
         *       //   "extensionSpec": {},
         *       //   "functionSpec": {},
         *       //   "name": "my_name",
         *       //   "openApiSpec": {},
         *       //   "toolType": "my_toolType"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "connectorSpec": {},
         *   //   "dataStoreSpec": {},
         *   //   "description": "my_description",
         *   //   "displayName": "my_displayName",
         *   //   "extensionSpec": {},
         *   //   "functionSpec": {},
         *   //   "name": "my_name",
         *   //   "openApiSpec": {},
         *   //   "toolType": "my_toolType"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Tools$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Tools$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Tool>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Tools$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Tools$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Tool>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Tool>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Tools$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Tool>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Tool>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Tools$Create extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Tool;
    }
    export interface Params$Resource$Projects$Locations$Agents$Tools$Delete extends StandardParameters {
        /**
         *
         */
        force?: boolean;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Tools$Export extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ExportToolsRequest;
    }
    export interface Params$Resource$Projects$Locations$Agents$Tools$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Tools$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Tools$Patch extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Tool;
    }
    export class Resource$Projects$Locations$Agents$Tools$Versions {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.tools.versions.create({
         *     parent:
         *       'projects/my-project/locations/my-location/agents/my-agent/tools/my-tool',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "createTime": "my_createTime",
         *       //   "displayName": "my_displayName",
         *       //   "name": "my_name",
         *       //   "tool": {},
         *       //   "updateTime": "my_updateTime"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "createTime": "my_createTime",
         *   //   "displayName": "my_displayName",
         *   //   "name": "my_name",
         *   //   "tool": {},
         *   //   "updateTime": "my_updateTime"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Tools$Versions$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ToolVersion>>;
        create(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ToolVersion>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ToolVersion>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ToolVersion>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ToolVersion>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.tools.versions.delete({
         *     force: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/tools/my-tool/versions/my-version',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Tools$Versions$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.tools.versions.get({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/tools/my-tool/versions/my-version',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "createTime": "my_createTime",
         *   //   "displayName": "my_displayName",
         *   //   "name": "my_name",
         *   //   "tool": {},
         *   //   "updateTime": "my_updateTime"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Tools$Versions$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ToolVersion>>;
        get(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ToolVersion>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ToolVersion>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ToolVersion>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ToolVersion>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.tools.versions.list({
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent:
         *       'projects/my-project/locations/my-location/agents/my-agent/tools/my-tool',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "toolVersions": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Tools$Versions$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListToolVersionsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListToolVersionsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListToolVersionsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListToolVersionsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListToolVersionsResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.tools.versions.restore(
         *     {
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/tools/my-tool/versions/my-version',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {}
         *       },
         *     },
         *   );
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "tool": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        restore(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Restore, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        restore(params?: Params$Resource$Projects$Locations$Agents$Tools$Versions$Restore, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1RestoreToolVersionResponse>>;
        restore(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Restore, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        restore(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Restore, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1RestoreToolVersionResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1RestoreToolVersionResponse>): void;
        restore(params: Params$Resource$Projects$Locations$Agents$Tools$Versions$Restore, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1RestoreToolVersionResponse>): void;
        restore(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1RestoreToolVersionResponse>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Tools$Versions$Create extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1ToolVersion;
    }
    export interface Params$Resource$Projects$Locations$Agents$Tools$Versions$Delete extends StandardParameters {
        /**
         *
         */
        force?: boolean;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Tools$Versions$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Tools$Versions$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Tools$Versions$Restore extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1RestoreToolVersionRequest;
    }
    export class Resource$Projects$Locations$Agents$Transitionroutegroups {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.transitionRouteGroups.create({
         *       languageCode: 'placeholder-value',
         *
         *       parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {
         *         //   "displayName": "my_displayName",
         *         //   "name": "my_name",
         *         //   "transitionRoutes": []
         *         // }
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "displayName": "my_displayName",
         *   //   "name": "my_name",
         *   //   "transitionRoutes": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>>;
        create(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.transitionRouteGroups.delete({
         *       force: 'placeholder-value',
         *
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/transitionRouteGroups/my-transitionRouteGroup',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.transitionRouteGroups.get({
         *       languageCode: 'placeholder-value',
         *
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/transitionRouteGroups/my-transitionRouteGroup',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "displayName": "my_displayName",
         *   //   "name": "my_name",
         *   //   "transitionRoutes": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>>;
        get(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.transitionRouteGroups.list({
         *       languageCode: 'placeholder-value',
         *
         *       pageSize: 'placeholder-value',
         *
         *       pageToken: 'placeholder-value',
         *
         *       parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "transitionRouteGroups": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListTransitionRouteGroupsResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTransitionRouteGroupsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTransitionRouteGroupsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTransitionRouteGroupsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListTransitionRouteGroupsResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await dialogflow.projects.locations.agents.transitionRouteGroups.patch({
         *       languageCode: 'placeholder-value',
         *
         *       name: 'projects/my-project/locations/my-location/agents/my-agent/transitionRouteGroups/my-transitionRouteGroup',
         *
         *       updateMask: 'placeholder-value',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {
         *         //   "displayName": "my_displayName",
         *         //   "name": "my_name",
         *         //   "transitionRoutes": []
         *         // }
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "displayName": "my_displayName",
         *   //   "name": "my_name",
         *   //   "transitionRoutes": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Create extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup;
    }
    export interface Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Delete extends StandardParameters {
        /**
         *
         */
        force?: boolean;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Get extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Transitionroutegroups$List extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Transitionroutegroups$Patch extends StandardParameters {
        /**
         *
         */
        languageCode?: string;
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1TransitionRouteGroup;
    }
    export class Resource$Projects$Locations$Agents$Webhooks {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.webhooks.create({
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "disabled": false,
         *       //   "displayName": "my_displayName",
         *       //   "genericWebService": {},
         *       //   "name": "my_name",
         *       //   "serviceDirectory": {},
         *       //   "timeout": "my_timeout"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "disabled": false,
         *   //   "displayName": "my_displayName",
         *   //   "genericWebService": {},
         *   //   "name": "my_name",
         *   //   "serviceDirectory": {},
         *   //   "timeout": "my_timeout"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Agents$Webhooks$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Agents$Webhooks$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Webhook>>;
        create(params: Params$Resource$Projects$Locations$Agents$Webhooks$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Webhooks$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Webhook>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Webhook>): void;
        create(params: Params$Resource$Projects$Locations$Agents$Webhooks$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Webhook>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Webhook>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.webhooks.delete({
         *     force: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/webhooks/my-webhook',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Agents$Webhooks$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Agents$Webhooks$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Agents$Webhooks$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Webhooks$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Agents$Webhooks$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.webhooks.get({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/webhooks/my-webhook',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "disabled": false,
         *   //   "displayName": "my_displayName",
         *   //   "genericWebService": {},
         *   //   "name": "my_name",
         *   //   "serviceDirectory": {},
         *   //   "timeout": "my_timeout"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Agents$Webhooks$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Agents$Webhooks$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Webhook>>;
        get(params: Params$Resource$Projects$Locations$Agents$Webhooks$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Webhooks$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Webhook>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Webhook>): void;
        get(params: Params$Resource$Projects$Locations$Agents$Webhooks$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Webhook>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Webhook>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.webhooks.list({
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location/agents/my-agent',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "webhooks": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Agents$Webhooks$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Agents$Webhooks$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListWebhooksResponse>>;
        list(params: Params$Resource$Projects$Locations$Agents$Webhooks$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Webhooks$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListWebhooksResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListWebhooksResponse>): void;
        list(params: Params$Resource$Projects$Locations$Agents$Webhooks$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListWebhooksResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListWebhooksResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.agents.webhooks.patch({
         *     name: 'projects/my-project/locations/my-location/agents/my-agent/webhooks/my-webhook',
         *
         *     updateMask: 'placeholder-value',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "disabled": false,
         *       //   "displayName": "my_displayName",
         *       //   "genericWebService": {},
         *       //   "name": "my_name",
         *       //   "serviceDirectory": {},
         *       //   "timeout": "my_timeout"
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "disabled": false,
         *   //   "displayName": "my_displayName",
         *   //   "genericWebService": {},
         *   //   "name": "my_name",
         *   //   "serviceDirectory": {},
         *   //   "timeout": "my_timeout"
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Agents$Webhooks$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Agents$Webhooks$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1Webhook>>;
        patch(params: Params$Resource$Projects$Locations$Agents$Webhooks$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Webhooks$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Webhook>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Webhook>): void;
        patch(params: Params$Resource$Projects$Locations$Agents$Webhooks$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Webhook>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1Webhook>): void;
    }
    export interface Params$Resource$Projects$Locations$Agents$Webhooks$Create extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Webhook;
    }
    export interface Params$Resource$Projects$Locations$Agents$Webhooks$Delete extends StandardParameters {
        /**
         *
         */
        force?: boolean;
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Webhooks$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Webhooks$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Agents$Webhooks$Patch extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1Webhook;
    }
    export class Resource$Projects$Locations$Operations {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.operations.cancel({
         *     name: 'projects/my-project/locations/my-location/operations/my-operation',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        cancel(params: Params$Resource$Projects$Locations$Operations$Cancel, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        cancel(params?: Params$Resource$Projects$Locations$Operations$Cancel, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        cancel(params: Params$Resource$Projects$Locations$Operations$Cancel, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        cancel(params: Params$Resource$Projects$Locations$Operations$Cancel, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        cancel(params: Params$Resource$Projects$Locations$Operations$Cancel, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        cancel(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.operations.get({
         *     name: 'projects/my-project/locations/my-location/operations/my-operation',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Operations$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Operations$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        get(params: Params$Resource$Projects$Locations$Operations$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Operations$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        get(params: Params$Resource$Projects$Locations$Operations$Get, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        get(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.operations.list({
         *     filter: 'placeholder-value',
         *
         *     name: 'projects/my-project/locations/my-location',
         *
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     returnPartialSuccess: 'placeholder-value',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "operations": [],
         *   //   "unreachable": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Operations$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Operations$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningListOperationsResponse>>;
        list(params: Params$Resource$Projects$Locations$Operations$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Operations$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningListOperationsResponse>, callback: BodyResponseCallback<Schema$GoogleLongrunningListOperationsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Operations$List, callback: BodyResponseCallback<Schema$GoogleLongrunningListOperationsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleLongrunningListOperationsResponse>): void;
    }
    export interface Params$Resource$Projects$Locations$Operations$Cancel extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Operations$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Operations$List extends StandardParameters {
        /**
         *
         */
        filter?: string;
        /**
         *
         */
        name?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        returnPartialSuccess?: boolean;
    }
    export class Resource$Projects$Locations$Securitysettings {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.securitySettings.create({
         *     parent: 'projects/my-project/locations/my-location',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "audioExportSettings": {},
         *       //   "deidentifyTemplate": "my_deidentifyTemplate",
         *       //   "displayName": "my_displayName",
         *       //   "insightsExportSettings": {},
         *       //   "inspectTemplate": "my_inspectTemplate",
         *       //   "name": "my_name",
         *       //   "purgeDataTypes": [],
         *       //   "redactionScope": "my_redactionScope",
         *       //   "redactionStrategy": "my_redactionStrategy",
         *       //   "retentionStrategy": "my_retentionStrategy",
         *       //   "retentionWindowDays": 0
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "audioExportSettings": {},
         *   //   "deidentifyTemplate": "my_deidentifyTemplate",
         *   //   "displayName": "my_displayName",
         *   //   "insightsExportSettings": {},
         *   //   "inspectTemplate": "my_inspectTemplate",
         *   //   "name": "my_name",
         *   //   "purgeDataTypes": [],
         *   //   "redactionScope": "my_redactionScope",
         *   //   "redactionStrategy": "my_redactionStrategy",
         *   //   "retentionStrategy": "my_retentionStrategy",
         *   //   "retentionWindowDays": 0
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        create(params: Params$Resource$Projects$Locations$Securitysettings$Create, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        create(params?: Params$Resource$Projects$Locations$Securitysettings$Create, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>>;
        create(params: Params$Resource$Projects$Locations$Securitysettings$Create, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        create(params: Params$Resource$Projects$Locations$Securitysettings$Create, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>): void;
        create(params: Params$Resource$Projects$Locations$Securitysettings$Create, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>): void;
        create(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.securitySettings.delete({
         *     name: 'projects/my-project/locations/my-location/securitySettings/my-securitySetting',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        delete(params: Params$Resource$Projects$Locations$Securitysettings$Delete, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        delete(params?: Params$Resource$Projects$Locations$Securitysettings$Delete, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        delete(params: Params$Resource$Projects$Locations$Securitysettings$Delete, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        delete(params: Params$Resource$Projects$Locations$Securitysettings$Delete, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(params: Params$Resource$Projects$Locations$Securitysettings$Delete, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        delete(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.securitySettings.get({
         *     name: 'projects/my-project/locations/my-location/securitySettings/my-securitySetting',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "audioExportSettings": {},
         *   //   "deidentifyTemplate": "my_deidentifyTemplate",
         *   //   "displayName": "my_displayName",
         *   //   "insightsExportSettings": {},
         *   //   "inspectTemplate": "my_inspectTemplate",
         *   //   "name": "my_name",
         *   //   "purgeDataTypes": [],
         *   //   "redactionScope": "my_redactionScope",
         *   //   "redactionStrategy": "my_redactionStrategy",
         *   //   "retentionStrategy": "my_retentionStrategy",
         *   //   "retentionWindowDays": 0
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Locations$Securitysettings$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Locations$Securitysettings$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>>;
        get(params: Params$Resource$Projects$Locations$Securitysettings$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Locations$Securitysettings$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>): void;
        get(params: Params$Resource$Projects$Locations$Securitysettings$Get, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>): void;
        get(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.securitySettings.list({
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     parent: 'projects/my-project/locations/my-location',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "securitySettings": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Locations$Securitysettings$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Locations$Securitysettings$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1ListSecuritySettingsResponse>>;
        list(params: Params$Resource$Projects$Locations$Securitysettings$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Locations$Securitysettings$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListSecuritySettingsResponse>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListSecuritySettingsResponse>): void;
        list(params: Params$Resource$Projects$Locations$Securitysettings$List, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListSecuritySettingsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1ListSecuritySettingsResponse>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.locations.securitySettings.patch({
         *     name: 'projects/my-project/locations/my-location/securitySettings/my-securitySetting',
         *
         *     updateMask: 'placeholder-value',
         *
         *     // Request body metadata
         *     requestBody: {
         *       // request body parameters
         *       // {
         *       //   "audioExportSettings": {},
         *       //   "deidentifyTemplate": "my_deidentifyTemplate",
         *       //   "displayName": "my_displayName",
         *       //   "insightsExportSettings": {},
         *       //   "inspectTemplate": "my_inspectTemplate",
         *       //   "name": "my_name",
         *       //   "purgeDataTypes": [],
         *       //   "redactionScope": "my_redactionScope",
         *       //   "redactionStrategy": "my_redactionStrategy",
         *       //   "retentionStrategy": "my_retentionStrategy",
         *       //   "retentionWindowDays": 0
         *       // }
         *     },
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "audioExportSettings": {},
         *   //   "deidentifyTemplate": "my_deidentifyTemplate",
         *   //   "displayName": "my_displayName",
         *   //   "insightsExportSettings": {},
         *   //   "inspectTemplate": "my_inspectTemplate",
         *   //   "name": "my_name",
         *   //   "purgeDataTypes": [],
         *   //   "redactionScope": "my_redactionScope",
         *   //   "redactionStrategy": "my_redactionStrategy",
         *   //   "retentionStrategy": "my_retentionStrategy",
         *   //   "retentionWindowDays": 0
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        patch(params: Params$Resource$Projects$Locations$Securitysettings$Patch, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        patch(params?: Params$Resource$Projects$Locations$Securitysettings$Patch, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>>;
        patch(params: Params$Resource$Projects$Locations$Securitysettings$Patch, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        patch(params: Params$Resource$Projects$Locations$Securitysettings$Patch, options: MethodOptions | BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>): void;
        patch(params: Params$Resource$Projects$Locations$Securitysettings$Patch, callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>): void;
        patch(callback: BodyResponseCallback<Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings>): void;
    }
    export interface Params$Resource$Projects$Locations$Securitysettings$Create extends StandardParameters {
        /**
         *
         */
        parent?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings;
    }
    export interface Params$Resource$Projects$Locations$Securitysettings$Delete extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Securitysettings$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Locations$Securitysettings$List extends StandardParameters {
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        parent?: string;
    }
    export interface Params$Resource$Projects$Locations$Securitysettings$Patch extends StandardParameters {
        /**
         *
         */
        name?: string;
        /**
         *
         */
        updateMask?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$GoogleCloudDialogflowCxV3beta1SecuritySettings;
    }
    export class Resource$Projects$Operations {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.operations.cancel({
         *     name: 'projects/my-project/operations/my-operation',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        cancel(params: Params$Resource$Projects$Operations$Cancel, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        cancel(params?: Params$Resource$Projects$Operations$Cancel, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleProtobufEmpty>>;
        cancel(params: Params$Resource$Projects$Operations$Cancel, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        cancel(params: Params$Resource$Projects$Operations$Cancel, options: MethodOptions | BodyResponseCallback<Schema$GoogleProtobufEmpty>, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        cancel(params: Params$Resource$Projects$Operations$Cancel, callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        cancel(callback: BodyResponseCallback<Schema$GoogleProtobufEmpty>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.operations.get({
         *     name: 'projects/my-project/operations/my-operation',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "done": false,
         *   //   "error": {},
         *   //   "metadata": {},
         *   //   "name": "my_name",
         *   //   "response": {}
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        get(params: Params$Resource$Projects$Operations$Get, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        get(params?: Params$Resource$Projects$Operations$Get, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningOperation>>;
        get(params: Params$Resource$Projects$Operations$Get, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        get(params: Params$Resource$Projects$Operations$Get, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningOperation>, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        get(params: Params$Resource$Projects$Operations$Get, callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        get(callback: BodyResponseCallback<Schema$GoogleLongrunningOperation>): void;
        /**
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/dialogflow.googleapis.com
         * // - Login into gcloud by running:
         * //   ```sh
         * //   $ gcloud auth application-default login
         * //   ```
         * // - Install the npm module by running:
         * //   ```sh
         * //   $ npm install googleapis
         * //   ```
         *
         * const {google} = require('googleapis');
         * const dialogflow = google.dialogflow('v3beta1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: [
         *       'https://www.googleapis.com/auth/cloud-platform',
         *       'https://www.googleapis.com/auth/dialogflow',
         *     ],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res = await dialogflow.projects.operations.list({
         *     filter: 'placeholder-value',
         *
         *     name: 'projects/my-project',
         *
         *     pageSize: 'placeholder-value',
         *
         *     pageToken: 'placeholder-value',
         *
         *     returnPartialSuccess: 'placeholder-value',
         *   });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {
         *   //   "nextPageToken": "my_nextPageToken",
         *   //   "operations": [],
         *   //   "unreachable": []
         *   // }
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        list(params: Params$Resource$Projects$Operations$List, options: StreamMethodOptions): Promise<GaxiosResponseWithHTTP2<Readable>>;
        list(params?: Params$Resource$Projects$Operations$List, options?: MethodOptions): Promise<GaxiosResponseWithHTTP2<Schema$GoogleLongrunningListOperationsResponse>>;
        list(params: Params$Resource$Projects$Operations$List, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        list(params: Params$Resource$Projects$Operations$List, options: MethodOptions | BodyResponseCallback<Schema$GoogleLongrunningListOperationsResponse>, callback: BodyResponseCallback<Schema$GoogleLongrunningListOperationsResponse>): void;
        list(params: Params$Resource$Projects$Operations$List, callback: BodyResponseCallback<Schema$GoogleLongrunningListOperationsResponse>): void;
        list(callback: BodyResponseCallback<Schema$GoogleLongrunningListOperationsResponse>): void;
    }
    export interface Params$Resource$Projects$Operations$Cancel extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Operations$Get extends StandardParameters {
        /**
         *
         */
        name?: string;
    }
    export interface Params$Resource$Projects$Operations$List extends StandardParameters {
        /**
         *
         */
        filter?: string;
        /**
         *
         */
        name?: string;
        /**
         *
         */
        pageSize?: number;
        /**
         *
         */
        pageToken?: string;
        /**
         *
         */
        returnPartialSuccess?: boolean;
    }
    export {};
}
