export type AlarmMessage = {
  AlarmName: string;
  AlarmDescription: string;
  AWSAccountId: string;
  AlarmConfigurationUpdatedTimestamp: string;
  NewStateValue: string;
  NewStateReason: string;
  StateChangeTime: string;
  Region: string;
  AlarmArn: string;
  OldStateValue: string;
  OKActions: string[];
  AlarmActions: string[];
  InsufficientDataActions: string[];
  Trigger: {
    MetricName: string;
    Namespace: string;
    StatisticType: string;
    Statistic: string;
    //   Unit: null,
    //   Dimensions: [ [Object] ],
    Period: number;
    EvaluationPeriods: number;
    ComparisonOperator: string;
    Threshold: number;
    TreatMissingData: string;
    EvaluateLowSampleCountPercentile: string;
  };
};
