import { useContext, useEffect, useState } from "react";
import { Link, Outlet, RouteObject, useParams } from "react-router-dom";
import FormattedMessage from "Element/FormattedMessage";
import { unixNow } from "@snort/shared";
import { NostrLink } from "@snort/system";

import Timeline from "Element/Feed/Timeline";
import { System } from "index";
import { TimelineSubject } from "Feed/TimelineFeed";
import { debounce, getRelayName, sha256 } from "SnortUtils";
import useLogin from "Hooks/useLogin";
import Discover from "Pages/Discover";
import TrendingUsers from "Element/TrendingUsers";
import TrendingNotes from "Element/Feed/TrendingPosts";
import HashTagsPage from "Pages/HashTagsPage";
import SuggestedProfiles from "Element/SuggestedProfiles";
import { TaskList } from "Tasks/TaskList";
import TimelineFollows from "Element/Feed/TimelineFollows";
import { RootTabs } from "Element/RootTabs";
import { DeckContext } from "Pages/DeckLayout";

import messages from "./messages";

interface RelayOption {
  url: string;
  paid: boolean;
}

export default function RootPage() {
  return (
    <>
      <div className="main-content p">
        <RootTabs base="" />
      </div>
      <div className="main-content">
        <Outlet />
      </div>
    </>
  );
}

const FollowsHint = () => {
  const { publicKey: pubKey, follows } = useLogin();
  if (follows.item?.length === 0 && pubKey) {
    return (
      <FormattedMessage
        {...messages.NoFollows}
        values={{
          newUsersPage: (
            <Link to={"/new/discover"}>
              <FormattedMessage {...messages.NewUsers} />
            </Link>
          ),
        }}
      />
    );
  }
  return null;
};

export const GlobalTab = () => {
  const { relays } = useLogin();
  const [relay, setRelay] = useState<RelayOption>();
  const [allRelays, setAllRelays] = useState<RelayOption[]>();
  const [now] = useState(unixNow());

  const subject: TimelineSubject = {
    type: "global",
    items: [],
    relay: relay?.url,
    discriminator: `all-${sha256(relay?.url ?? "").slice(0, 12)}`,
  };

  function globalRelaySelector() {
    if (!allRelays || allRelays.length === 0) return null;

    const paidRelays = allRelays.filter(a => a.paid);
    const publicRelays = allRelays.filter(a => !a.paid);
    return (
      <div className="flex mb10 f-end nowrap">
        <FormattedMessage
          defaultMessage="Read global from"
          description="Label for reading global feed from specific relays"
        />
        &nbsp;
        <select
          className="f-ellipsis"
          onChange={e => setRelay(allRelays.find(a => a.url === e.target.value))}
          value={relay?.url}>
          {paidRelays.length > 0 && (
            <optgroup label="Paid Relays">
              {paidRelays.map(a => (
                <option key={a.url} value={a.url}>
                  {getRelayName(a.url)}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Public Relays">
            {publicRelays.map(a => (
              <option key={a.url} value={a.url}>
                {getRelayName(a.url)}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
    );
  }

  useEffect(() => {
    return debounce(500, () => {
      const ret: RelayOption[] = [];
      System.Sockets.forEach(v => {
        ret.push({
          url: v.address,
          paid: v.info?.limitation?.payment_required ?? false,
        });
      });
      ret.sort(a => (a.paid ? -1 : 1));

      if (ret.length > 0 && !relay) {
        setRelay(ret[0]);
      }
      setAllRelays(ret);
    });
  }, [relays, relay]);

  return (
    <>
      {globalRelaySelector()}
      {relay && <Timeline subject={subject} postsOnly={false} method={"TIME_RANGE"} window={600} now={now} />}
    </>
  );
};

export const NotesTab = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deckContext = useContext(DeckContext);

  return (
    <>
      <FollowsHint />
      <TaskList />
      <TimelineFollows
        postsOnly={true}
        noteOnClick={
          deckContext
            ? ev => {
                deckContext.setThread(NostrLink.fromEvent(ev));
              }
            : undefined
        }
      />
    </>
  );
};

export const ConversationsTab = () => {
  return <TimelineFollows postsOnly={false} />;
};

export const TagsTab = (params: { tag?: string }) => {
  const { tag } = useParams();
  const t = params.tag ?? tag ?? "";
  const subject: TimelineSubject = {
    type: "hashtag",
    items: [t],
    discriminator: `tags-${t}`,
    streams: true,
  };

  return <Timeline subject={subject} postsOnly={false} method={"TIME_RANGE"} />;
};

const DefaultTab = () => {
  const { preferences, publicKey } = useLogin();
  const tab = publicKey ? preferences.defaultRootTab ?? `notes` : `trending/notes`;
  const elm = RootTabRoutes.find(a => a.path === tab)?.element;
  return elm;
};

export const RootTabRoutes = [
  {
    path: "",
    element: <DefaultTab />,
  },
  {
    path: "global",
    element: <GlobalTab />,
  },
  {
    path: "notes",
    element: <NotesTab />,
  },
  {
    path: "conversations",
    element: <ConversationsTab />,
  },
  {
    path: "discover",
    element: <Discover />,
  },
  {
    path: "tag/:tag",
    element: <TagsTab />,
  },
  {
    path: "trending/notes",
    element: <TrendingNotes />,
  },
  {
    path: "trending/people",
    element: <TrendingUsers />,
  },
  {
    path: "suggested",
    element: (
      <div className="p">
        <SuggestedProfiles />
      </div>
    ),
  },
  {
    path: "t/:tag",
    element: <HashTagsPage />,
  },
];

export const RootRoutes = [
  {
    path: "/",
    element: <RootPage />,
    children: RootTabRoutes,
  },
] as RouteObject[];
