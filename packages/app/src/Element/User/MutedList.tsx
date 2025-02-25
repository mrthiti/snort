import FormattedMessage from "Element/FormattedMessage";
import { HexKey } from "@snort/system";
import MuteButton from "Element/User/MuteButton";
import ProfilePreview from "Element/User/ProfilePreview";
import useModeration from "Hooks/useModeration";

import messages from "../messages";

export interface MutedListProps {
  pubkeys: HexKey[];
}

export default function MutedList({ pubkeys }: MutedListProps) {
  const { isMuted, muteAll } = useModeration();
  const hasAllMuted = pubkeys.every(isMuted);

  return (
    <div className="main-content p">
      <div className="flex f-space">
        <div className="bold">
          <FormattedMessage {...messages.MuteCount} values={{ n: pubkeys?.length }} />
        </div>
        <button
          disabled={hasAllMuted || pubkeys.length === 0}
          className="transparent"
          type="button"
          onClick={() => muteAll(pubkeys)}>
          <FormattedMessage {...messages.MuteAll} />
        </button>
      </div>
      {pubkeys?.map(a => {
        return <ProfilePreview actions={<MuteButton pubkey={a} />} pubkey={a} options={{ about: false }} key={a} />;
      })}
    </div>
  );
}
