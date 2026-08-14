// Curated 3GPP knowledge base for the Standards Assistant demo.
// Browser-safe, pure data. Imported by the streaming server route.
// Citations reference real 3GPP spec clauses; page numbers are indicative.

export type Source = {
  spec: string;
  page: string;
  section: string;
};

export type KbEntry = {
  id: string;
  title: string;
  keywords: string[];
  answer: string;
  sources: Source[];
};

export const SYSTEM_INTRO =
  "I'm the **3GPP Standards Assistant** — I answer questions about 5G (and 4G) system architecture, procedures, and protocols using the 3GPP specification set. Ask me about network slicing, the Service-Based Architecture, PDU sessions, AMF/SMF/UPF, 5G QoS, registration, or security.";

export const KB: KbEntry[] = [
  {
    id: "slicing",
    title: "Network Slicing",
    keywords: [
      "slice", "slicing", "s-nssai", "nssai", "sst", "slice differentiator",
      "nssf", "embb", "urllc", "miot", "network slice",
    ],
    answer:
      "**Network slicing** lets an operator run multiple logical end-to-end networks on shared infrastructure, each tuned to a service profile (eMBB, URLLC, mIoT).\n\n- A slice is identified by **S-NSSAI** = Slice/Service Type (SST) + optional Slice Differentiator (SD).\n- The **NSSF** selects the network slice instance; the AMF uses the configured/allowed NSSAI to route the UE to the right slice functions.\n- Slices are isolated across RAN, transport, and core — each may have dedicated NF instances (AMF/SMF/UPF) or share them.\n- A UE can be configured with up to 8 S-NSSAIs and registered to one or more slices simultaneously.\n\nSee TS 23.501 §5.15.",
    sources: [
      { spec: "TS 23.501", page: "221", section: "§5.15 Network Slicing" },
      { spec: "TS 23.502", page: "112", section: "§4.9 Slice selection" },
    ],
  },
  {
    id: "sba",
    title: "Service-Based Architecture (SBA)",
    keywords: [
      "service based", "sba", "service based architecture", "nrf", "nrf discovery",
      "sbie", "service based interface", "rest", "http/2", "json", "nf", "network function",
    ],
    answer:
      "The 5G Core adopts a **Service-Based Architecture (SBA)**: control-plane Network Functions (NFs) expose their capabilities as services over a common **Service Based Interface (SBI)** using HTTP/2 + JSON.\n\n- The **NRF** (Network Repository Function) maintains the NF profile catalog; NFs register with it and discover each other by service or target-NF type.\n- Each service operation is a RESTful verb on a resource URI (e.g. `POST /namf-comm/v1/.../N1N2MessageTransfer`).\n- This replaces the point-to-point reference-point model of 4G with composable, discoverable services — enabling new functions and vendor flexibility.\n- AMF, SMF, PCF, UDM, UDR, UDW, UDSF, AUSF, NEF, NSSF, AF, LMF, SEPP all participate in the SBA.\n\nSee TS 23.501 §4 and TS 29.500-series for the SBI stage-3 APIs.",
    sources: [
      { spec: "TS 23.501", page: "56", section: "§4 System architecture" },
      { spec: "TS 29.500", page: "18", section: "§4 Service Based Interface" },
    ],
  },
  {
    id: "pdu",
    title: "PDU Session Establishment",
    keywords: [
      "pdu", "pdu session", "session establishment", "session setup",
      "n4", "nsmf", "n1 sm", "dnn", "apn", "ip allocation", " pdu",
    ],
    answer:
      "A **PDU Session** is the association between a UE and a DN (data network) over which user-plane traffic flows. Establishment is triggered by the UE sending a `PDU Session Establishment Request` (NAS).\n\n1. UE → AMF carries the request in an UL NAS Transport with a PDU session ID, DNN, S-NSSAI and requested PDU session type.\n2. AMF selects an **SMF** and forwards the request via `Nsmf_PDUSession_CreateSMContext`.\n3. SMF selects a **UPF** and an optional Secondary UPF, and establishes the **N4** session (PFCP) to install packet-detection / forwarding rules.\n4. SMF triggers **secondary authentication/authorization** (if needed) and asks the UDM for subscription + the PCF for a **PCC** policy.\n5. SMF returns the N1 SM *Configuration* and QoS rules to the UE; the UPF tunnel (N3 GTP-U) and N9 are established.\n\nSee TS 23.502 §4.3.2.",
    sources: [
      { spec: "TS 23.502", page: "91", section: "§4.3.2 PDU Session Establishment" },
      { spec: "TS 23.501", page: "150", section: "§6.3.3 User Plane Function" },
    ],
  },
  {
    id: "amf",
    title: "AMF responsibilities",
    keywords: [
      "amf", "access and mobility", "mobility management", "n1", "n2",
      "registration", "n1 nas", "nas termination", "rm",
    ],
    answer:
      "The **AMF** (Access and Mobility Management Function) terminates NAS (N1) and NGAP (N2) and anchors mobility + access management.\n\n- Terminates **RAN-CP (N2)** and **NAS (N1)** signaling, and handles **Registration, Connection & Mobility Management** state machines.\n- Performs **access authentication & authorization** by interacting with the UDM/AUSF (primary authentication, EAP-AKA').\n- Selects the SMF for PDU sessions and relays N1/N2 SM messages transparently.\n- Computes the UE's serving area, handles reachability and idle-mode paging, and lawfully-intercepts CP traffic.\n- One AMF instance can serve multiple S-NSSAIs; it is selected by the **NSSF** + AM Set.\n\nSee TS 23.501 §6.2.1.",
    sources: [
      { spec: "TS 23.501", page: "310", section: "§6.2.1 Access and Mobility Management Function" },
      { spec: "TS 38.413", page: "12", section: "§8 NG Application Protocol" },
    ],
  },
  {
    id: "smf",
    title: "SMF responsibilities",
    keywords: [
      "smf", "session management", "n4", "pfcp", "session management function",
      "ip address", "upf selection", "pdu session control",
    ],
    answer:
      "The **SMF** (Session Management Function) is the control-plane brain of a PDU session.\n\n- Handles **session management (SM)** — establishment, modification and release of PDU sessions and their QoS Flows.\n- Selects and controls the **UPF** over **N4 (PFCP)**: installs packet-detection, forwarding, QoS-enforcement and usage-reporting rules.\n- Allocates the UE IP address / prefix (or delegates to a DHCP server / DN-AAA), and handles DHCPv4/v6.\n- Interacts with the **PCF** for session policies/charging, and with the **UDM** for SM subscription data.\n- Roams: acts as H-SMF or V-SMF; an I-SMF is inserted when the V-SMF can't reach the selected UPF.\n\nSee TS 23.501 §6.2.2.",
    sources: [
      { spec: "TS 23.501", page: "320", section: "§6.2.2 Session Management Function" },
      { spec: "TS 29.244", page: "30", section: "§5 PFCP procedures (N4)" },
    ],
  },
  {
    id: "upf",
    title: "UPF responsibilities",
    keywords: [
      "upf", "user plane", "user plane function", "n3", "n6", "n9", "gtp-u",
      "data network", "forwarding", "qos enforcement", "charging",
    ],
    answer:
      "The **UPF** (User Plane Function) is the user-plane anchor of the 5G core.\n\n- Forwards user traffic between the (R)AN over **N3** and the DN over **N6**, and UPF↔UPF over **N9** — all GTP-U tunnels.\n- Enforces **QoS** (per QoS Flow marking/DSCP), performs packet inspection and applies the PDR/FAR/QER rules received from the SMF over **N4 (PFCP)**.\n- Generates usage reports for **charging** (data volume, duration) and supports lawful interception.\n- Optionally supports traffic steering to a **Local Area Data Network (LADN)** / edge (MEC) UPF and buffering of downlink data when the UE is idle.\n\nSee TS 23.501 §6.3 and TS 29.244 for the N4 rules.",
    sources: [
      { spec: "TS 23.501", page: "340", section: "§6.3 User Plane Function" },
      { spec: "TS 29.244", page: "30", section: "§5 PFCP rules (N4)" },
    ],
  },
  {
    id: "qos",
    title: "5G QoS model",
    keywords: [
      "qos", "5qi", "qfi", "qos flow", "quality of service", "gbr", "non-gbr",
      "reflective qos", "rqos", "arp", "priority",
    ],
    answer:
      "5G uses a **flow-based QoS model** instead of 4G's EPS bearer model. A **QoS Flow** (identified by a **QFI**, 6 bits) is the finest-grained QoS distinction in the PDU session.\n\n- Each QoS Flow is described by a **5QI** (5G QoS Identifier) plus optional ARP, MBR/GBR and Averaging Window. Standardized 5QIs map to a combination of Resource Type, Priority Level, Packet Delay Budget and Packet Error Rate.\n- **GBR** vs **non-GBR**: GBR flows get guaranteed bit rate resources; non-GBR (e.g. 5QI 9) share the session's aggregate maximum.\n- **Reflective QoS (RQI)**: the UE derives uplink QoS rules from the marking of downlink traffic, avoiding explicit signaling per flow.\n- The SMF establishes QoS Flows via the N4 session and N1 SM QoS rules; the RAN maps them to DRBs.\n\nSee TS 23.501 §5.7.",
    sources: [
      { spec: "TS 23.501", page: "180", section: "§5.7 Quality of Service model" },
      { spec: "TS 23.501", page: "187", section: "§5.7.4 5QI to QoS parameters" },
    ],
  },
  {
    id: "registration",
    title: "Registration procedure",
    keywords: [
      "registration", "register", "initial registration", "registration request",
      "guti", "suci", "amf selection", "rm registered",
    ],
    answer:
      "**Registration** is the first step a UE performs to access 5G services (RM-REGISTERED state).\n\n1. UE sends a **Registration Request** (NAS) over the initial RRC message, carrying a **5G-GUTI** (if available) or a **SUCI** (subscriber concealed identifier), requested NSSAI and registration type.\n2. The (R)AN selects an AMF (via RAN-level routing / AMF set) or uses the indicated 5G-GUTI to route to the serving AMF.\n3. AMF runs **primary authentication** with UDM/AUSF (EAP-AKA' / 5G AKA) and fetches the subscription **Slice Selection** (NSSAI) via NSSF.\n4. AMF retrieves the UE's **Access & Mobility subscription** and SMF-selection data from the UDM (or UDR).\n5. AMF assigns a new 5G-GUTI and acknowledges; the UE is now RM-REGISTERED and can establish PDU sessions.\n\nSee TS 23.502 §4.2.",
    sources: [
      { spec: "TS 23.502", page: "30", section: "§4.2 Registration" },
      { spec: "TS 23.501", page: "96", section: "§5.3.2 Registration Management" },
    ],
  },
  {
    id: "security",
    title: "Security & authentication",
    keywords: [
      "security", "authentication", "eap-aka", "aka", "ausf", "primary authentication",
      "integrity", "ciphering", "key hierarchy", "kseaf", "kgnb", "credentials",
    ],
    answer:
      "5G security is layered over the access and defines a full **key hierarchy**.\n\n- **Primary authentication** runs between UE, AMF (SEAF) and AUSF, backed by UDM/UDR, using **5G AKA** or **EAP-AKA'**. On success the AUSF derives **KSEAF** and sends it to the SEAF/AMF.\n- The AMF derives **KAMF** from KSEAF; from KAMF come the NAS keys (**KNASint**, **KNASenc**) and the access keys pushed to the (R)AN (**KNG-RAN** → **KRRCenc/int**, **KUPenc**).\n- NAS signaling has **integrity** protection always (mandatory in 5G, unlike 4G optional) and optional **ciphering**; AS (RRC/UP) has both.\n- The **SUCI** conceals the permanent identity (SUPI) using the HN public key, so the network never sees the SUPI over the air until the home network resolves it.\n\nSee TS 33.501 §6.",
    sources: [
      { spec: "TS 33.501", page: "40", section: "§6 Authentication & key agreement" },
      { spec: "TS 33.501", page: "55", section: "§6.12 SUCI / privacy" },
    ],
  },
  {
    id: "suci",
    title: "SUCI / SUPI privacy",
    keywords: [
      "suci", "supi", "privacy", "concealed", "public key", "home network public key",
      "imsi", "identity", "5g-guti", "subscription permanent identifier",
    ],
    answer:
      "5G fixes the long-standing **IMSI catcher** problem from 4G by concealing the permanent identity over the air.\n\n- The permanent identity is the **SUPI** (Subscription Permanent Identifier), e.g. `IMSI` or a Network Access Identifier.\n- The UE sends a **SUCI** (Subscriber Concealed Identifier) by encrypting the SUPI's MSIN part with the **Home Network Public Key** (ECIES scheme) provisioned by the UDM.\n- Only the home **SIDF** (Subscriber Identifier De-concealing Function, in UDM/UDR) can recover the SUPI from the SUCI using the matching private key.\n- After registration, the UE is addressed by the temporary **5G-GUTI**, so the SUCI is rarely retransmitted.\n\nSee TS 33.501 §6.12 and TS 23.501 §5.9.",
    sources: [
      { spec: "TS 33.501", page: "55", section: "§6.12 Subscription Identifier Privacy" },
      { spec: "TS 23.501", page: "120", section: "§5.9 Subscription Identifier Privacy" },
    ],
  },
  {
    id: "rrc-states",
    title: "RRC states & RRC_INACTIVE",
    keywords: [
      "rrc", "rrc idle", "rrc inactive", "rrc connected", "inactive", "ran notification",
      "rna", "paging", "rrc state", "5g state machine", "cm idle",
    ],
    answer:
      "5G introduces a third RRC state — **RRC_INACTIVE** — to balance battery life and latency.\n\n- **RRC_IDLE**: no RRC context; UE camps on a cell, is reachable by CN paging, and must do a full registration/connection setup to send data.\n- **RRC_INACTIVE**: the UE keeps the NG-RAN context (and a RAN-based paging area, the **RNA**); it can resume quickly (resume via a resume ID) without full signaling, and is paged by the **gNB** (RAN paging), not the core.\n- **RRC_CONNECTED**: full RRC context, the UE has an active NG/Uu connection and exchanges data.\n\nThe state machine and transition conditions (inactivity timers, RNA updates) are defined in TS 38.331 (RRC) and the design rationale in TR 38.804.",
    sources: [
      { spec: "TS 38.331", page: "78", section: "§5.3 RRC states & transitions" },
      { spec: "TR 38.804", page: "40", section: "§6 RRC_INACTIVE rationale" },
    ],
  },
  {
    id: "nef",
    title: "Network Exposure (NEF)",
    keywords: [
      "nef", "network exposure", "exposure", "api", "af", "application function",
      "capability exposure", "monitoring", "provisioning", "northbound",
    ],
    answer:
      "The **NEF** (Network Exposure Function) is the secure northbound API gateway of the 5G core.\n\n- It exposes 3GPP network capabilities to trusted/untrusted **Application Functions (AFs)** over a RESTful API: monitoring (UE reachability, location), provisioning (parameters), policy/charging triggers, and QoS/traffic-influence requests.\n- Maps AF requests (external identifiers, DNNs) to internal core identities and translates them to PCF/UDM/UPF actions.\n- Stores information (e.g. allowed AF requests) in the **UDSF** and supports external parameter provisioning.\n- Provides the standard entry point for MEC, slicing management and partner APIs.\n\nSee TS 23.501 §6.2.9 and the NEF stage-3 in TS 29.522.",
    sources: [
      { spec: "TS 23.501", page: "300", section: "§6.2.9 Network Exposure Function" },
      { spec: "TS 29.522", page: "20", section: "§4 NEF APIs" },
    ],
  },
  {
    id: "edge",
    title: "Edge computing / MEC",
    keywords: [
      "edge", "mec", "local upf", "ladn", "edge computing", "traffic steering",
      "upf edge", "low latency", "local breakout", "dn",
    ],
    answer:
      "**Edge computing (MEC)** in 5G brings the user-plane and applications close to the UE by placing a **UPF** and an Application Function (AF) near the access.\n\n- The SMF inserts a **local/PSA UPF** for a PDU session using **traffic-steering rules** from the PCF/AF, so traffic matching a destination is broken out locally (UL CL or branching) instead of traversing the central DN.\n- **LADN** (Local Area Data Network) lets a UE access a DNN only within a configured service area; the AMF notifies the SMF when the UE enters/leaves the LADN area.\n- The AF requests QoS and traffic steering via the NEF (or directly if trusted), enabling URLLC and low-latency enterprise services.\n\nSee TS 23.501 §5.13 and §5.6.",
    sources: [
      { spec: "TS 23.501", page: "200", section: "§5.13 Edge computing" },
      { spec: "TS 23.501", page: "175", section: "§5.6 LADN" },
    ],
  },
  {
    id: "roaming",
    title: "Roaming architecture",
    keywords: [
      "roaming", "roam", "h-plmn", "v-plmn", "home routed", "local breakout",
      "sepp", "i-smf", "roamer", "visited network",
    ],
    answer:
      "5G supports two main roaming models for the control and user plane.\n\n- **Home-Routed**: the UE's PDU session terminates at a **H-UPF** in the home PLMN; the V-PLMN only transports. All traffic and policies are home-controlled; latency is higher.\n- **Local Breakout (LBO)**: the PDU session anchors at a **V-UPF** in the visited PLMN; the V-SMF and V-PCF apply local policies while the H-SMF/H-PCF keep overall control via the home network.\n- All inter-PLMN SBI traffic crosses the **SEPP** (Security Edge Protection Proxy) on each side for message filtering and application-layer security (TLS + OAuth / application-layer signatures).\n- An **I-SMF** may be inserted when the V-SMF can't reach the selected UPF (e.g. home-routed edge cases).\n\nSee TS 23.501 §5.16 and TS 33.501 §6.1.3.",
    sources: [
      { spec: "TS 23.501", page: "235", section: "§5.16 Roaming" },
      { spec: "TS 33.501", page: "62", section: "§6.1.3 SEPP security" },
    ],
  },
  {
    id: "n2-n3",
    title: "N2 / N3 / NGAP & GTP-U",
    keywords: [
      "n2", "n3", "n6", "n9", "ngap", "gtp-u", "gtp", "interfaces", "reference point",
      "tunnel", "user plane tunnel", "n4 pfcp", "s1",
    ],
    answer:
      "The 5G reference points between (R)AN, core and data network:\n\n- **N1** (UE↔AMF): NAS signaling. **N2** ((R)AN↔AMF): NGAP over SCTP. **N3** ((R)AN↔UPF): GTP-U user plane.\n- **N4** (SMF↔UPF): PFCP, used to install PDR/FAR/QER rules. **N6** (UPF↔DN): normal IP/ETH. **N9** (UPF↔UPF): GTP-U between core UPFs.\n- **NGAP** (TS 38.413) carries PDU session resource setup/modify, paging, UE context management and N2 SM info between gNB and AMF.\n- **GTP-U** (TS 29.281) tunnels PDUs on N3/N9 with the TEID assigned by the receiving node.\n\nSee TS 23.501 §5.x reference points and TS 38.413 / TS 29.244.",
    sources: [
      { spec: "TS 23.501", page: "50", section: "§4.6 Reference points" },
      { spec: "TS 38.413", page: "12", section: "§8 NGAP (N2)" },
    ],
  },
  {
    id: "ims-vonr",
    title: "Voice / IMS / VoNR",
    keywords: [
      "voice", "vonr", "volte", "ims", "voice over nr", "eps fallback",
      "ims voice", "5qi 1", "conversational",
    ],
    answer:
      "Voice in 5G is provided by **IMS** (the same IMS core as VoLTE) over a 5QI=1 (conversational GBR) QoS Flow — i.e. **VoNR** (Voice over NR).\n\n- The UE negotiates IMS voice support at registration via the **IMS Voice over PS** indicator; the HPLMN & VPLMN support must match.\n- **EPS Fallback**: if the NR coverage or UE/RAN can't support VoNR, the network moves the UE to EPS (LTE/VoLTE) to anchor the voice call, then returns (fast return).\n- **5QI 1** = conversational voice, GBR, ~100 ms PDB, with the standard 5QI=2 (conversational video) and 5QI=5 (IMS signaling, non-GBR) supporting the call setup.\n- IMS procedures (registration, session setup) are defined in TS 23.228; the 5G-IMS interworking in TS 23.501 §5.17.\n\nSee TS 23.228 and TS 23.501 §5.17.",
    sources: [
      { spec: "TS 23.228", page: "140", section: "§5 IMS session control" },
      { spec: "TS 23.501", page: "245", section: "§5.17 IMS voice" },
    ],
  },
  {
    id: "4g-5g",
    title: "4G (EPC) vs 5G (5GC) core",
    keywords: [
      "4g", "5g", "epc", "lte", "epc vs 5gc", "difference", "evolved packet core",
      "bearer", "mme", "sgw", "pgw", "architecture difference", "sba",
    ],
    answer:
      "Key architectural differences between **EPC (4G)** and **5GC (5G)**:\n\n- **Control plane**: EPC uses dedicated nodes (MME, S/PGW-C, PCRF) with point-to-point interfaces (S6a, S11…). 5GC uses a **Service-Based Architecture** with NFs (AMF, SMF, PCF…) discovering each other via the **NRF** over HTTP/2.\n- **User plane**: 4G anchors a PDN connection at the **PGW-U**; 5G can anchor and steer at multiple **UPFs** with N4 (PFCP) for flexible routing and edge break-out.\n- **QoS**: 4G = EPS bearer model (default + dedicated bearers). 5G = **QoS Flow** model (QFI/5QI) with reflective QoS.\n- **Identity**: 4G sends the **IMSI** in the clear; 5G sends a **SUCI** (encrypted SUPI).\n- **Slicing**: native in 5G (NSSAI); not in 4G. Plus a new **RRC_INACTIVE** state.\n\nSee TS 23.501 §4 and TR 23.799.",
    sources: [
      { spec: "TS 23.501", page: "56", section: "§4 5G System architecture" },
      { spec: "TR 23.799", page: "30", section: "§6 EPC→5GC study" },
    ],
  },
];

const GREETING_PATTERNS = [
  "hi", "hello", "hey", "hiya", "yo", "good morning", "good evening",
  "namaste", "greetings", "thanks", "thank you",
];

export function isGreeting(q: string): boolean {
  const s = q.trim().toLowerCase();
  if (GREETING_PATTERNS.includes(s)) return true;
  // "what can you do", "who are you", "help"
  return /^(what can you (do|answer)|who are you|help|what are you)/.test(s);
}

export type RetrievalResult = {
  answer: string;
  sources: Source[];
  matched: boolean;
};

// Tokenize and score entries against the query.
export function retrieve(query: string): RetrievalResult {
  const q = query.toLowerCase();

  if (isGreeting(q)) {
    return {
      answer:
        SYSTEM_INTRO +
        "\n\nA few things I can help with:\n- **Network slicing** & S-NSSAI\n- **Service-Based Architecture** (SBA / NRF)\n- **PDU session** establishment\n- **AMF / SMF / UPF** responsibilities\n- **5G QoS** (5QI, QFI, QoS Flow)\n- **Registration** & **security** (SUCI, EAP-AKA')\n\nTry one of the example prompts below.",
      sources: [],
      matched: true,
    };
  }

  const titleWords = (e: KbEntry) =>
    e.title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);

  let best: { entry: KbEntry; score: number } | null = null;

  for (const entry of KB) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw)) score += kw.length > 6 ? 2 : 1;
    }
    for (const w of titleWords(entry)) {
      if (q.includes(w)) score += 1;
    }
    // bonus for exact spec mentions like "23.501"
    for (const src of entry.sources) {
      const num = src.spec.replace("TS ", "").replace("TR ", "").toLowerCase();
      if (q.includes(num)) score += 3;
    }
    if (!best || score > best.score) best = { entry, score };
  }

  if (best && best.score >= 1) {
    return {
      answer: best.entry.answer,
      sources: best.entry.sources,
      matched: true,
    };
  }

  // Graceful fallback
  return {
    answer:
      "I couldn't find a specific clause for that in the indexed 3GPP specs.\n\nI can answer well on: **network slicing**, the **Service-Based Architecture**, **PDU sessions**, **AMF/SMF/UPF**, **5G QoS**, **registration**, **security (SUCI/EAP-AKA')**, **RRC states**, **roaming**, **edge/MEC**, and the **4G vs 5G** core. Try rephrasing or pick an example below.",
    sources: [],
    matched: false,
  };
}
