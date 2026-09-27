import {
  Injectable,
} from "@nitrostack/core";

@Injectable()
export class TestService {
  health() {
    return { ok: true };
  }
}
