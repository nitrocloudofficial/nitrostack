export class GuardianAgent {

  evaluate(breathing: boolean, movement: boolean) {

    if (!breathing && movement) {
      return {
        alert: true,
        level: "warning",
        message: "Movement detected without breathing."
      };
    }

    if (!breathing && !movement) {
      return {
        alert: true,
        level: "critical",
        message: "No breathing or movement detected."
      };
    }

    return {
      alert: false,
      level: "normal",
      message: "Monitoring normally."
    };
  }

}