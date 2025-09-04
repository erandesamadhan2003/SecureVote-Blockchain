

# 📜 ElectionFactory Contract

## Overview

`ElectionFactory.sol` ek **root contract** hai jo system ka entry point hai.
Iska kaam:

* Naye elections create karna
* Election ka detail store karna
* Election ke liye `ElectionManager` contract deploy karna
* Admins aur authorities ko manage karna

---

## 🛠 Libraries Used

1. **OpenZeppelin AccessControl**

   * Multiple roles (SuperAdmin, ElectionAuthority).
   * Flexible permission system.

2. **OpenZeppelin ReentrancyGuard**

   * Functions ko re-entrancy attack se protect karta hai.

---

## 🏗 Contract Structure

* **Roles:**

  * `SUPER_ADMIN`: Highest level control (multiple accounts allowed).
  * `ELECTION_AUTHORITY`: Elections manage karne wale log.

* **State Variables:**<!--  -->

  * `electionCount`: Total elections created.
  * `mapping(uint256 => Election) elections`: Election details store karne ke liye.

* **Structs:**

  ```solidity
  struct Election {
      uint256 id;
      string title;
      string description;
      address manager;  // Address of ElectionManager contract
  }
  ```

* **Events:**

  * `ElectionCreated(uint256 id, string title, string description, address manager)`

---

## 🔑 Functions and Purpose

### 1. **constructor()**

* **Kaam:**

  * Deploy hone wale account ko `SUPER_ADMIN` role dena.
  * Roles ke hierarchy set karna (sirf SuperAdmins hi authorities add/remove kar sakte hain).
* **Access:** Public (only deployment ke time call hota hai).

---

### 2. **addSuperAdmin(address account)**

* **Kaam:**

  * Naye `SUPER_ADMIN` ko assign karna.
* **Access:** Only `SUPER_ADMIN`.
* **Use Case:** Agar ek se zyada admins chahiye ho.

---

### 3. **removeSuperAdmin(address account)**

* **Kaam:**

  * Koi admin hata dena.
* **Access:** Only `SUPER_ADMIN`.

---

### 4. **addElectionAuthority(address account)**

* **Kaam:**

  * Kisi account ko election authority banana.
* **Access:** Only `SUPER_ADMIN`.
* **Use Case:** Authority voter registration, candidate approval aur election manage karega.

---

### 5. **removeElectionAuthority(address account)**

* **Kaam:**

  * Election authority role revoke karna.
* **Access:** Only `SUPER_ADMIN`.

---

### 6. **createElection(string \_title, string \_description)**

* **Kaam:**

  * Naya election create karna.
  * Election ke liye ek `ElectionManager` contract deploy karna.
  * Election detail store karna (`id, title, description, manager address`).
  * Event emit karna `ElectionCreated`.
* **Access:** Only `SUPER_ADMIN`.

---

### 7. **getElection(uint256 \_id)**

* **Kaam:**

  * Kisi election ka detail return karna.
* **Access:** Public (sab dekh sakte hain).
* **Return:** Election struct (id, title, description, manager address).

---

## ⚙️ Workflow

1. Contract deploy hoga → `msg.sender` ko `SUPER_ADMIN` role milega.
2. SuperAdmin → nayi ElectionAuthority ko assign karega (agar chahiye).
3. SuperAdmin → `createElection()` call karega.

   * Ek naya `ElectionManager` deploy hoga.
   * Election info mapping me save hoga.
   * `ElectionCreated` event emit hoga.
4. ElectionManager contract → election lifecycle (registration, voting, results) handle karega.

---

## ✅ Example Flow

1. `deployer` deploys `ElectionFactory` → deployer is `SUPER_ADMIN`.
2. `deployer` calls `addSuperAdmin(0x123...)` → ab ek aur SuperAdmin hai.
3. Any SuperAdmin calls `createElection("Presidential Election", "National Level Election")`.
4. System automatically deploys `ElectionManager` for that election.

---

## 🔐 Security Features

* **AccessControl:** Roles-based restricted functions.
* **Multiple Admins:** Ek se zyada SuperAdmins ho sakte hain.
* **ReentrancyGuard:** `createElection` safe hai re-entrancy se.

---
<br>
<br>
<br>


# 📜 ElectionManager Contract 

## Overview

`ElectionManager.sol` ek **per-election controller contract** hai.
Har election ke liye `ElectionFactory` ek naya `ElectionManager` deploy karta hai.

Ye contract manage karta hai:

* Election lifecycle (Created → Registration → Voting → Ended → ResultsDeclared)
* Authorities jo election control karte hain
* Candidate aur voter registry ke integration points
* Voting aur result calculation triggers
* Emergency stop controls

---

## 🛠 Libraries Used

1. **OpenZeppelin AccessControl**

   * Multiple roles define aur manage karne ke liye.
2. **OpenZeppelin ReentrancyGuard**

   * Voting aur result-related functions ko re-entrancy se protect karne ke liye.

---

## 🏗 Contract Structure

### 1. **Roles**

* `SUPER_ADMIN`:

  * Highest authority for this election.
  * Add/remove `ELECTION_AUTHORITY`.
  * Emergency stop karne ka right.

* `ELECTION_AUTHORITY`:

  * Multiple accounts ho sakte hain.
  * Election lifecycle manage karte hain (registration, voting, results).

---

### 2. **Enums**

```solidity
enum ElectionPhase { Created, Registration, Voting, Ended, ResultsDeclared }
enum ElectionType { Presidential, Parliamentary, Local, Corporate, Referendum }
```

* **ElectionPhase:** Current stage track karta hai.
* **ElectionType:** Election ka type (alag rules ke liye).

---

### 3. **Struct**

```solidity
struct ElectionInfo {
    uint256 id;
    string title;
    string description;
    ElectionType electionType;
    ElectionPhase currentPhase;
    uint256 registrationStart;
    uint256 registrationEnd;
    uint256 votingStart;
    uint256 votingEnd;
}
```

* Har election ki info store hoti hai.

---

### 4. **State Variables**

* `ElectionInfo public election;` → Current election ka detail.

---

### 5. **Events**

* `PhaseChanged(ElectionPhase newPhase)` → Jab election ek nayi phase me jaye.
* `AuthorityAdded(address account)` → Jab nayi authority add ho.
* `AuthorityRemoved(address account)` → Jab authority remove ho.

---

## 🔑 Functions and Purpose

### 1. **constructor(...)**

* **Kaam:** Election ki initial info set karna aur SuperAdmin ko assign karna.
* **Access:** Sirf `ElectionFactory` ke deploy time pe call hota hai.

---

### 2. **addAuthority(address account)**

* **Kaam:** Nayi election authority add karna.
* **Access:** Only `SUPER_ADMIN`.
* **Note:** Multiple authorities allowed.

---

### 3. **removeAuthority(address account)**

* **Kaam:** Koi authority remove karna.
* **Access:** Only `SUPER_ADMIN`.

---

### 4. **startRegistration(uint256 start, uint256 end)**

* **Kaam:** Registration phase start karna.
* **Effect:**

  * Voters aur candidates register ho sakte hain.
  * Election phase change hota hai → `Registration`.
* **Access:** Only `ELECTION_AUTHORITY`.

---

### 5. **startVoting(uint256 start, uint256 end)**

* **Kaam:** Voting phase start karna.
* **Effect:**

  * Voters ab vote cast kar sakte hain.
  * Election phase change hota hai → `Voting`.
* **Access:** Only `ELECTION_AUTHORITY`.

---

### 6. **endVoting()**

* **Kaam:** Voting band karna.
* **Effect:** Election phase change hota hai → `Ended`.
* **Access:** Only `ELECTION_AUTHORITY`.

---

### 7. **declareResults()**

* **Kaam:** Results declare karna (ResultCalculator se tally karna).
* **Effect:** Election phase change hota hai → `ResultsDeclared`.
* **Access:** Only `ELECTION_AUTHORITY`.

---

### 8. **emergencyStop()**

* **Kaam:** Agar koi fraud ya problem ho, to election forcefully band kar dena.
* **Effect:** Election phase set ho jata hai → `Ended`.
* **Access:** Only `SUPER_ADMIN`.

---

## ⚙️ Workflow

1. **Factory Deployment**

   * ElectionFactory deploys `ElectionManager`.
   * SuperAdmin role assign hota hai.

2. **Authority Assignment**

   * SuperAdmin authorities add/remove kar sakta hai.

3. **Election Lifecycle**

   * Authorities start registration → voters/candidates register karte hain.
   * Authorities start voting → voters vote cast karte hain.
   * Authorities end voting.
   * Authorities declare results.

4. **Emergency Handling**

   * Agar koi problem ho to SuperAdmin emergencyStop() call kar sakta hai.

---

## ✅ Real-World Analogy

* **SuperAdmin** = Chief Election Commissioner (highest control).
* **ElectionAuthority** = State Election Commissioners / Officials (jo ground par manage karte hain).
* **Phases** = Election lifecycle (announce → register → vote → count → results).

---

## 🔐 Security Features

* **AccessControl** → Multiple role system.
* **Multiple Authorities** → Committee-like structure (real world jaise).
* **Emergency Stop** → Fraud hone par system halt.
* **Phase Restrictions** → Functions sirf valid phase me call ho sakte hain.

---

<br>
<br>
<br>


# 📜 VoterRegistry Contract Documentation

## Overview

`VoterRegistry.sol` ek contract hai jo election ke liye **voters ka record maintain** karta hai.
Ye ensure karta hai ki:

* Har voter apne wallet + Aadhaar hash ke sath register kare.
* Election authorities voter ko verify karein.
* Ek voter sirf ek baar vote kar sake.
* VotingEngine vote cast karne se pehle voter ki eligibility check kare.

---

## 🛠 Libraries Used

* **OpenZeppelin AccessControl**

  * Role-based permissions ke liye.

---

## 🏗 Contract Structure

### 1. Roles

* `ELECTION_AUTHORITY`

  * Election officials jo voters ko verify karenge aur voting complete hone ke baad mark karenge.
  * Sirf ye hi sensitive functions call kar sakte hain.

---

### 2. Struct: `Voter`

```solidity
struct Voter {
    address walletAddress;   // Voter ka wallet (MetaMask address)
    string name;             // Voter ka naam
    string aadhaarHash;      // Aadhaar number ka hashed value (unique ID)
    bool isVerified;         // Authority dwara verify kiya gaya ya nahi
    bool hasVoted;           // Voter ne vote diya ya nahi
}
```

---

### 3. State Variables

* `mapping(address => Voter) public voters;`

  * Har wallet address ke liye ek Voter record store hota hai.

---

### 4. Events

* `event VoterRegistered(address voter, string name, string aadhaarHash);`
* `event VoterVerified(address voter);`
* `event VoterVoted(address voter);`

---

## 🔑 Functions and Purpose

### 1. `constructor(address authority)`

* **Kaam:** Deployment ke time ek authority ko `ELECTION_AUTHORITY` role assign karna.
* **Access:** Sirf deploy ke waqt call hota hai (ElectionManager/ElectionFactory ke through).

---

### 2. `registerVoter(string name, string aadhaarHash)`

* **Kaam:**

  * Voter apna naam aur Aadhaar hash ke sath register karega.
  * Aadhaar hash ensure karta hai ki voter unique hai.
* **Checks:**

  * Same wallet dobara register na ho.
* **Access:** Public (koi bhi apne wallet se register kar sakta hai).
* **Emit:** `VoterRegistered`.

---

### 3. `verifyVoter(address voter)`

* **Kaam:**

  * Authority voter ke registration ko verify kare.
  * Sirf verified voters hi vote kar sakte hain.
* **Checks:**

  * Voter registered hona chahiye.
* **Access:** Only `ELECTION_AUTHORITY`.
* **Emit:** `VoterVerified`.

---

### 4. `isEligible(address voter)` (view)

* **Kaam:**

  * Return karega `true` agar voter verified hai aur abhi tak vote nahi diya.
* **Use Case:**

  * VotingEngine ye check karega before allowing vote.

---

### 5. `markVoted(address voter)`

* **Kaam:**

  * Jab voter ne vote diya ho, VotingEngine ye function call karke voter ko mark kare.
* **Checks:**

  * Voter verified hona chahiye.
  * Voter ne pehle vote na diya ho.
* **Access:** Only `ELECTION_AUTHORITY`.
* **Emit:** `VoterVoted`.

---

## ⚙️ Workflow

1. **Self-Registration**

   * Voter calls → `registerVoter("Samadhan", "aadhaarHash123")`.
2. **Verification by Authority**

   * Authority calls → `verifyVoter(0xVoterAddress)`.
3. **Eligibility Check Before Voting**

   * VotingEngine calls → `isEligible(0xVoterAddress)`.
4. **Mark Voter as Voted**

   * After successful vote, VotingEngine calls → `markVoted(0xVoterAddress)`.

---

## ✅ Real-World Analogy

* **registerVoter** = Voter khud ko enrollment form me fill karta hai.
* **verifyVoter** = Election officer document check karke approve karta hai.
* **isEligible** = Voting booth check karta hai ki voter allowed hai ya nahi.
* **markVoted** = Finger pe ink lagana (ek hi baar vote karne ke liye).

---

## 🔐 Security Features

* Aadhaar hash → identity uniqueness.
* AccessControl → sirf authorities hi sensitive actions kar sakte hain.
* Prevents double voting (`hasVoted` flag).
* Data transparency (sab mapping aur events public).

---
<br>
<br>
<br>



# 📜 CandidateRegistry Contract Documentation

## Overview

`CandidateRegistry.sol` ek contract hai jo har election ke liye **candidates ka record maintain** karta hai.
Ye ensure karta hai ki:

* Har candidate apne wallet + Aadhaar hash ke sath register kare.
* Candidate apna naam, party aur manifesto submit kare.
* Election authorities candidates ko verify karein.
* Sirf verified candidates hi election me vote ke liye khade ho sakein.

---

## 🛠 Libraries Used

* **OpenZeppelin AccessControl**

  * Role-based permissions ke liye.

---

## 🏗 Contract Structure

### 1. Roles

* `ELECTION_AUTHORITY`

  * Election officials jo candidates ko verify karte hain.
  * Sirf ye hi sensitive functions (verify/remove) call kar sakte hain.

---

### 2. Struct: `Candidate`

```solidity
struct Candidate {
    uint256 id;              // Candidate ID (auto incremented)
    address walletAddress;   // Candidate ka wallet address
    string name;             // Candidate ka naam
    string party;            // Party affiliation
    string manifesto;        // Candidate ka manifesto (short statement)
    string aadhaarHash;      // Aadhaar number ka hashed value (unique identity)
    bool isVerified;         // Authority dwara verify kiya ya nahi
}
```

---

### 3. State Variables

* `uint256 public candidateCount;`

  * Candidate IDs assign karne ke liye counter.
* `mapping(uint256 => Candidate) public candidates;`

  * Candidate ID → Candidate details.
* `mapping(address => bool) public hasRegistered;`

  * Prevents duplicate registration from same wallet.

---

### 4. Events

* `event CandidateRegistered(uint256 candidateId, address wallet, string name, string party);`
* `event CandidateVerified(uint256 candidateId);`
* `event CandidateRemoved(uint256 candidateId);`

---

## 🔑 Functions and Purpose

### 1. `constructor(address authority)`

* **Kaam:** Deployment ke time ek authority ko `ELECTION_AUTHORITY` role assign karna.
* **Access:** Sirf deploy ke waqt call hota hai (ElectionManager/ElectionFactory ke through).

---

### 2. `registerCandidate(string name, string party, string manifesto, string aadhaarHash)`

* **Kaam:**

  * Candidate apna naam, party, manifesto aur Aadhaar hash ke sath register kare.
  * Aadhaar hash ensure karta hai ki candidate unique hai.
* **Checks:**

  * Same wallet dobara register na kare.
* **Access:** Public (koi bhi apne wallet se register kar sakta hai).
* **Emit:** `CandidateRegistered`.

---

### 3. `verifyCandidate(uint256 candidateId)`

* **Kaam:**

  * ElectionAuthority candidate ke registration ko verify kare.
  * Sirf verified candidates election me participate kar sakte hain.
* **Checks:**

  * Candidate registered hona chahiye.
* **Access:** Only `ELECTION_AUTHORITY`.
* **Emit:** `CandidateVerified`.

---

### 4. `removeCandidate(uint256 candidateId)`

* **Kaam:**

  * Agar koi candidate disqualify ho jaye to remove karna.
* **Checks:**

  * Candidate registered hona chahiye.
* **Access:** Only `ELECTION_AUTHORITY`.
* **Emit:** `CandidateRemoved`.

---

### 5. `getCandidate(uint256 candidateId)` (view)

* **Kaam:** Candidate ke details return kare (naam, party, manifesto, verification status).
* **Access:** Public (koi bhi dekh sakta hai).

---

### 6. `getAllCandidates()` (view)

* **Kaam:** Sabhi registered candidates ka list return kare.
* **Access:** Public.

---

## ⚙️ Workflow

1. **Self-Registration**

   * Candidate calls → `registerCandidate("Rahul", "ABC Party", "Education Reform", "aadhaarHash123")`.
2. **Verification by Authority**

   * Authority calls → `verifyCandidate(1)`.
3. **Disqualification (optional)**

   * Authority calls → `removeCandidate(1)` if fraud or invalid.
4. **Candidate Data Access**

   * Public calls → `getAllCandidates()` to see candidate list and their status.

---

## ✅ Real-World Analogy

* **registerCandidate** = Nomination form fill karna.
* **verifyCandidate** = Election Commission candidate ko approve karta hai.
* **removeCandidate** = Nomination cancel/disqualify.
* **getAllCandidates** = Official candidate list publish karna.

---

## 🔐 Security Features

* Aadhaar hash → identity uniqueness.
* AccessControl → sirf authorities hi verify/remove kar sakte hain.
* Prevents duplicate registration using wallet + Aadhaar hash.
* Public transparency with candidate details.

---
<br>
<br>
<br>


---

# 📜 VotingEngine Contract Documentation

## Overview

`VotingEngine.sol` election ka **core voting process** handle karta hai.
Ye ensure karta hai ki:

* Sirf verified voters (from VoterRegistry) vote kar sakein.
* Sirf verified candidates (from CandidateRegistry) ko votes milein.
* Har voter sirf **ek hi baar** vote kar sake.
* Votes securely count ho aur results later declare ho sakein.

---

## 🛠 Libraries Used

* **OpenZeppelin AccessControl** → Role-based access.
* **OpenZeppelin ReentrancyGuard** → Reentrancy attacks se bachav.
* **OpenZeppelin Pausable** → Emergency pause option.

---

## 🏗 Contract Structure

### 1. Roles

* `SUPER_ADMIN` → overall control (pause/unpause, config update).
* `ELECTION_AUTHORITY` → election authority jo contract ko manage kar sakta hai.
* `VOTER` → voter jo vote cast karega (self role, no special grant needed).

---

### 2. Data Structures

#### Enums

```solidity
enum VoteMode { Direct, CommitReveal }
```

* **Direct** → vote directly count hota hai.
* **Commit–Reveal** → pehle commit, fir reveal (privacy ke liye optional).

#### State Variables

* `mapping(uint256 => uint256) candidateVotes;` → Candidate ID → vote count.
* `mapping(address => bytes32) voteCommit;` → Voter address → committed vote hash.
* `mapping(address => bool) revealed;` → Voter ne reveal kiya ya nahi.

#### External Contracts

* `ElectionManager` → phase check.
* `VoterRegistry` → voter eligibility + mark voted.
* `CandidateRegistry` → candidate verification.

---

### 3. Events

* `event VoteCast(address voter, uint256 candidateId);`
* `event VoteCommitted(address voter, bytes32 commitment);`
* `event VoteRevealed(address voter, uint256 candidateId);`
* `event Paused(address account);`
* `event Unpaused(address account);`

---

## 🔑 Functions and Purpose

### 1. Constructor

* **Kaam:** ElectionManager, VoterRegistry, CandidateRegistry aur mode set karna.
* **Access:** Deployment ke time.

---

### 2. `castVote(uint256 candidateId)`

* **Kaam:** Direct voting me voter apna vote cast karega.
* **Checks:**

  * Phase `Voting` hona chahiye.
  * Voter eligible hona chahiye.
  * Candidate verified hona chahiye.
  * Voter ne dobara vote na kiya ho.
* **Emit:** `VoteCast`.

---

### 3. `commitVote(bytes32 commitment)`

* **Kaam:** Commit–reveal mode me pehle vote ka hash commit karna.
* **Checks:**

  * Phase `Voting` hona chahiye.
  * Voter eligible hona chahiye.
  * Voter dobara commit na kare.
* **Emit:** `VoteCommitted`.

---

### 4. `revealVote(uint256 candidateId, bytes32 nonce)`

* **Kaam:** Commit–reveal mode me vote ko reveal karke tally karna.
* **Checks:**

  * Commitment exist hona chahiye.
  * Hash match hona chahiye.
  * Candidate valid aur verified hona chahiye.
* **Effects:** Candidate ka vote count increment hota hai + voter mark ho jata hai.
* **Emit:** `VoteRevealed`.

---

### 5. `totalFor(uint256 candidateId)` (view)

* **Kaam:** Kisi candidate ke total votes return kare.
* **Access:** Public (koi bhi dekh sakta hai).

---

### 6. Admin Functions

* `pause()` / `unpause()` → Emergency ke liye.
* `setAddresses(...)` → External contracts update karne ke liye (sirf `SUPER_ADMIN`).

---

## ⚙️ Workflow

### Direct Voting Flow

1. Voter → `castVote(candidateId)`.
2. Contract → eligibility check + candidate check.
3. Contract → `candidateVotes[candidateId]++` + `markVoted(voter)`.
4. Event emit → `VoteCast`.

### Commit–Reveal Flow

1. Voter → `commitVote(commitHash)`.
2. Later, voter → `revealVote(candidateId, nonce)`.
3. Contract → commitment verify karega + candidate check karega.
4. Contract → `candidateVotes[candidateId]++` + `markVoted(voter)`.
5. Event emit → `VoteRevealed`.

---

## ✅ Real-World Analogy

* **castVote** = Polling booth me directly vote dalna.
* **commitVote** = Sealed envelope me vote dena.
* **revealVote** = Counting ke din envelope kholkar vote dikhana.
* **totalFor** = Counting ke baad har candidate ke total votes.

---

## 🔐 Security Features

* **Phase check** → sirf `Voting` phase me vote possible.
* **Eligibility check** → sirf verified voters.
* **Candidate check** → sirf verified candidates.
* **Double-vote prevention** → markVoted call.
* **ReentrancyGuard** → vote functions safe.
* **Pausable** → emergency stop.
* **Commit binding** → commit hash me voter address include hota hai to prevent replay.

---

<br>
<br>
<br>


# 📜 ResultCalculator Contract Documentation

## Overview

`ResultCalculator.sol` ka main kaam election ke votes ko **count, finalize aur declare** karna hai.
Ye contract **VotingEngine** se data lekar election ke results calculate karta hai aur fir public ke liye publish karta hai.

Iska role hai:

* Vote counting complete karna.
* Winner declare karna (single-winner ya top-candidate logic).
* Publicly accessible results provide karna.
* Election ke phase ko `ResultsDeclared` me shift karna.

---

## 🛠 Libraries Used

* **OpenZeppelin AccessControl** → Role-based access.
* **OpenZeppelin ReentrancyGuard** → Security ke liye.
* **OpenZeppelin Pausable** → Emergency ke liye (optional).

---

## 🏗 Contract Structure

### 1. Roles

* `SUPER_ADMIN` → overall control (pause/unpause, finalize force).
* `ELECTION_AUTHORITY` → result finalize karne ka right.
* `PUBLIC` → results read karne ke liye (read-only).

---

### 2. State Variables

* `address public votingEngine;` → votes count lane ke liye engine ka address.

* `address public electionManager;` → phase control ke liye.

* `bool public resultsFinalized;` → ek hi baar result declare ho.

* `uint256 public winningCandidateId;` → winner ka candidate ID.

* `mapping(uint256 => uint256) public finalTally;`
  Candidate ID → final vote count.

---

### 3. Events

* `event ResultsFinalized(uint256 winningCandidateId, uint256 votes);`
* `event CandidateResult(uint256 candidateId, uint256 votes);`

---

## 🔑 Functions and Purpose

### 1. Constructor

* **Kaam:** VotingEngine aur ElectionManager set karna.
* **Access:** Deployment ke time.

---

### 2. `finalizeResults()`

* **Kaam:**

  * VotingEngine se sabhi candidates ke votes lane.
  * Sabko `finalTally` me store karna.
  * Winner calculate karke store karna.
  * Election phase ko `ResultsDeclared` me set karna.
* **Checks:**

  * Sirf ek baar ho (resultsFinalized == false).
  * Election phase `Ended` hona chahiye.
* **Access:** Only `ELECTION_AUTHORITY`.
* **Emit:**

  * `CandidateResult(candidateId, votes)` for all candidates.
  * `ResultsFinalized(winningCandidateId, votes)` for winner.

---

### 3. `getWinner()` (view)

* **Kaam:** Winner ka candidate ID aur votes return karna.
* **Access:** Public.

---

### 4. `getCandidateResult(uint256 candidateId)` (view)

* **Kaam:** Specific candidate ke final votes return karna.
* **Access:** Public.

---

### 5. `getAllResults()` (view)

* **Kaam:** Sabhi candidates ke final results ek array/list me return karna.
* **Access:** Public.

---

### 6. Admin Functions

* `pause()` / `unpause()` → Emergency ke liye.
* `setAddresses(...)` → VotingEngine/ElectionManager update karne ke liye.

---

## ⚙️ Workflow

### Result Declaration Flow

1. **Voting Ended** → ElectionManager phase ko `Ended` set karta hai.
2. **Authority Calls** → `finalizeResults()`.
3. Contract →

   * VotingEngine se sab candidates ke vote count fetch karta hai.
   * Final tally store karta hai.
   * Winner calculate karta hai (highest votes).
   * ElectionManager ko `ResultsDeclared` phase me set karta hai.
4. Public → `getWinner()` / `getAllResults()` se results dekh sakta hai.

---

## ✅ Real-World Analogy

* **finalizeResults** = Election Commission counting complete karke official result declare karta hai.
* **getWinner** = Winning candidate ki ghoshna.
* **getAllResults** = Har candidate ke total votes ke saath gazette notification.

---

## 🔐 Security Features

* Results ek hi baar finalize ho.
* Sirf `ELECTION_AUTHORITY` result finalize kar sakta hai.
* `ElectionManager` phase check karta hai (Ended → ResultsDeclared).
* Public transparency with per-candidate result data.
* Pausable contract in case of emergency.

---

## Example Winner Logic

* Simple majority: jiske sabse zyada votes ho, wahi winner.
* Agar tie ho → authority manual resolve kare (optional logic).

---

## ⚙️ Integration

* `VotingEngine` → provides candidate vote counts.
* `ElectionManager` → control karega ki kab results finalize karne allowed hai.
* `CandidateRegistry` → indirectly used (candidates ke IDs valid hote hain).

---


# 📜 AuditTrail Contract Documentation

## Overview

`AuditTrail.sol` contract ka main purpose hai election process ke **events aur actions ka tamper-proof record** maintain karna.
Ye ensure karta hai ki:

* Har critical step log ho jaye (voter registration, candidate registration, vote cast, result finalize).
* Logs immutable ho (chain par proof rahe).
* Public aur third-party auditors election process ko validate kar saken.

---

## 🛠 Libraries Used

* **OpenZeppelin AccessControl** → Roles manage karne ke liye.
* **OpenZeppelin ReentrancyGuard** → Security ke liye.

---

## 🏗 Contract Structure

### 1. Roles

* `SUPER_ADMIN` → full control.
* `ELECTION_AUTHORITY` → authorized logs push karne ka right.
* `PUBLIC` → sirf read access.

---

### 2. Struct: `AuditLog`

```solidity
struct AuditLog {
    uint256 timestamp;       // Block timestamp
    string action;           // Action ka naam (e.g., "VoterVerified", "VoteCast")
    address performedBy;     // Kisne action kiya (authority/voter)
    string details;          // Extra info (candidate ID, voter ID, etc.)
}
```

---

### 3. State Variables

* `AuditLog[] public logs;` → sabhi logs ka array.

---

### 4. Events

* `event LogRecorded(string action, address indexed performedBy, string details);`

---

## 🔑 Functions and Purpose

### 1. `recordAction(string action, address performedBy, string details)`

* **Kaam:** New log create karke blockchain par store karna.
* **Checks:**

  * Sirf `ELECTION_AUTHORITY` ya `SUPER_ADMIN` call kar sake.
* **Emit:** `LogRecorded`.

---

### 2. `getLogs()` (view)

* **Kaam:** Sabhi logs ka array return karna.
* **Access:** Public.

---

### 3. `getLogCount()` (view)

* **Kaam:** Total kitne logs recorded hai wo batana.
* **Access:** Public.

---

### 4. `getLogByIndex(uint256 index)` (view)

* **Kaam:** Specific log record return karna.
* **Access:** Public.

---

## ⚙️ Workflow

1. **During Election Operations**

   * Jab voter register/verify hota hai → authority `recordAction("VoterVerified", authorityAddress, voterAddress)` call karegi.
   * Jab candidate verify hota hai → `recordAction("CandidateVerified", authorityAddress, candidateId)`.
   * Jab vote cast hota hai → `recordAction("VoteCast", voterAddress, candidateId)`.
   * Jab results finalize hote hain → `recordAction("ResultsDeclared", authorityAddress, winnerId)`.

2. **After Election**

   * Public → `getLogs()` call karke complete audit trail check kar sakta hai.
   * External observer → blockchain ke logs ko verify kar sakta hai ki koi tampering nahi hui.

---

## ✅ Real-World Analogy

* **AuditTrail** = Election Commission ke **Form 20 + Counting Sheets** jisme har action aur result ka official record hota hai.
* Ye election ke "black box" ki tarah hai — sab kuch record hota hai aur dispute ke time proof ke roop me use hota hai.

---

## 🔐 Security Features

* Immutable logs → blockchain par permanent rahenge.
* AccessControl → sirf authorized roles logs push kar sakte hain.
* Public transparency → koi bhi logs verify kar sakta hai.
* Protection against tampering → ek baar record hone ke baad change nahi hoga.

---
<br>
<br>
<br>


---

# 📜 ZKVerifier Contract Documentation

## Overview

`ZKVerifier.sol` ka kaam hai **privacy-preserving verification** provide karna — yani votes ya identities ko validate karna bina sensitive data (jaise plain Aadhaar) chain par reveal kiye.
Ye contract `VotingEngine`, `VoterRegistry` (aur agar lagu ho to external ZK proof systems) ke saath integrate hota hai, taaki:

* Voter ke submitted proof ko verify kiya ja sake.
* Duplicate identity / double-use detect karne mein help mile.
* On-chain verification se vote acceptance ka trust bana rahe, bina raw identity share kiye.

> Note: Real ZK circuits (Circom etc.) off-chain banaye jayenge; snark proofs (proof + publicSignals) on-chain `ZKVerifier` se verify karwaya jayega via verifier contract generated by `snarkjs` / `groth16` / `plonk` toolchain.

---

## 🛠 Libraries & Tools (Project Scope)

* **OpenZeppelin AccessControl** — role-based access for admin ops.
* **OpenZeppelin ReentrancyGuard** — safe verifier calls (if mutating).
* **snarkjs / circom** — *off-chain* to build circuits and generate verifier contract (not a Solidity library; workflow detail below).
* Verifier contract produced by `snarkjs` (`Verifier.sol`) will be imported/used by `ZKVerifier.sol`.

---

## 🏗 Contract Structure (High-level)

### Roles

* `SUPER_ADMIN` — contract configuration, set verifier address, emergency pause.
* `ELECTION_AUTHORITY` — (optional) can register trusted off-chain verifiers, revoke, or mark exceptions.
* `PUBLIC` — anyone can submit proofs (voter) but only verified proofs are accepted.

### State variables (suggested)

* `address public verifierContract;` — address of the SNARK verifier contract (auto-generated).
* `mapping(bytes32 => bool) public usedNullifiers;` — prevent double-use (nullifier from ZK).
* `mapping(bytes32 => bool) public validRoots;` — optional: Merkle roots of allowed identity set (for allowlists).
* `bool public paused;` — emergency flag.
* `uint256 public proofTypeVersion;` — versioning for circuit compatibility.

### Events

* `event ProofVerified(address indexed voter, bytes32 nullifier, bytes32 root);`
* `event NullifierSeen(bytes32 nullifier);`
* `event RootAdded(bytes32 root);`
* `event RootRemoved(bytes32 root);`
* `event VerifierContractUpdated(address newVerifier);`

---

## 🔑 Concepts to Understand (before implementation)

1. **Proof vs Public Signals**

   * Off-chain circuit produces `proof` + `publicSignals`. Public signals are small values the verifier expects (e.g., Merkle root, nullifier hash, candidateId commitment).
2. **Nullifier**

   * A value derived in ZK that ensures a secret (identity) is used only once; checking `usedNullifiers[nullifier]` prevents double-use while not revealing identity.
3. **Merkle Root / Allowlist** (optional)

   * If you maintain an on-chain allowlist of eligible identities via Merkle roots, verifier checks that the public `root` is a registered root — so only eligible identities pass.
4. **Verifier Contract**

   * The solidity verifier (generated) exposes `verifyProof(...)` function; ZKVerifier calls that and processes results.

---

## 🔑 Functions & Purpose (Detailed)

### 1. `constructor(address _verifierContract, address superAdmin)`

* **Kaam:** set initial verifier contract address, grant `SUPER_ADMIN`.
* **Access:** deployment time (ElectionFactory / deployer).

### 2. `setVerifierContract(address _verifier) external onlyRole(SUPER_ADMIN)`

* **Kaam:** agar naya SNARK verifier generate hua ho to update address.
* **Emit:** `VerifierContractUpdated`.

### 3. `addRoot(bytes32 root) external onlyRole(SUPER_ADMIN)`

* **Kaam:** Merkle root add karna (allowlist).
* **Emit:** `RootAdded`.

### 4. `removeRoot(bytes32 root) external onlyRole(SUPER_ADMIN)`

* **Kaam:** root revoke karna.
* **Emit:** `RootRemoved`.

### 5. `verifyVoteProof(bytes memory proof, uint256[] memory publicSignals) external whenNotPaused returns (bool)`

* **Kaam:** **core function** — called by `VotingEngine` (or directly by voter) to verify the submitted proof for a vote.
* **Flow:**

  1. Call underlying `verifierContract.verifyProof(...)` with proof & publicSignals.
  2. If verifier returns true:

     * Extract `nullifier` and `root` and optionally `candidateId` from `publicSignals` (format agreed off-chain).
     * Check `usedNullifiers[nullifier]` false → if true revert (double-use).
     * Check `validRoots[root]` true if using allowlist (optional) → else revert.
     * Mark `usedNullifiers[nullifier] = true`.
     * Emit `ProofVerified(...)`.
     * Return `true`.
  3. Else revert/return false.
* **Access:** generally public — VotingEngine will call it.

### 6. `isNullifierUsed(bytes32 nullifier) external view returns (bool)`

* **Kaam:** check double-spend prevention.

### 7. `pause()` / `unpause()` — Only `SUPER_ADMIN`

* **Kaam:** emergency control.

---

## 🔗 Integration (How it plugs into rest of system)

### Typical vote flow with ZK:

1. Voter generates ZK proof off-chain using circuit (inputs: private identity secret, candidateId, merkle path, nonce -> outputs: proof + publicSignals \[root, nullifierHash, candidateCommitment]).
2. Frontend sends proof + publicSignals to backend/frontend which submits to `VotingEngine.castVote(...)` (or directly to `ZKVerifier.verifyVoteProof(...)` depending architecture).
3. `VotingEngine` calls `ZKVerifier.verifyVoteProof(proof, publicSignals)` before accepting and counting the vote.
4. If `ZKVerifier` returns true: VotingEngine proceeds to mark voter voted and increments candidate tally (and calls `VoterRegistry.markVoted()` or similar).
5. `ZKVerifier` ensures nullifier not used (prevent double-vote) but identity not revealed.

### Where publicSignals come from (standard example)

* `publicSignals = [root, nullifierHash, candidateIdCommitment]`

  * `root` → merkle root of eligible identity set
  * `nullifierHash` → unique per identity usage
  * `candidateIdCommitment` → (optional) binding to which candidate voter voted (so reveal-less verification possible)

> Important: On-chain contract must agree with off-chain circuit order & types of public signals.

---

## 🔐 Security & Privacy Considerations

* **Verifier contract must be correct** — generated by trusted toolchain (Circom + snarkjs). Mismatch breaks verification.
* **Nullifier collision** — ensure nullifier generation on-circuit is collision-resistant (use secure hash with secret + electionId).
* **Replay protection across elections** — include `electionId` in nullifier/circuit inputs so a nullifier valid in one election cannot be reused in another.
* **Root freshness** — only accept proofs for roots currently valid; rotate roots if allowlist updates.
* **Off-chain security** — private keys and secret seeds used to generate proofs must be kept secret by voters. UI must guide how to generate proofs.
* **Gas cost** — verifying proofs on-chain can be expensive; prefer optimized circuits / plonk for lower verifier size if possible.

---

## 🧪 Testing Checklist

* ✅ Correct verifier contract address wired.
* ✅ `verifyVoteProof` returns true for a valid proof (use test proofs from snarkjs).
* ✅ `verifyVoteProof` reverts/returns false for invalid proof or wrong publicSignals.
* ✅ `usedNullifiers` prevents double-use: submitting same proof twice should fail second time.
* ✅ Root whitelist flow: proof with unregistered root rejected; adding root accepts it.
* ✅ Election-bound nullifiers: proof for election A cannot be used for election B (if implemented).
* ✅ Pause/unpause disables/enables verification.
* ✅ Event emission correctness (ProofVerified with correct nullifier/root).

---

## 🔧 Example Implementation Notes (practical tips)

* Generate verifier with snarkjs:

  1. Design circuit (Circom) that verifies identity membership and produces nullifier.
  2. Compile circuit, run trusted setup (if Groth16), create `verification_key.json`.
  3. Use `snarkjs` to generate `Verifier.sol` and `proof` test files.
* Deploy `Verifier.sol` first, then deploy `ZKVerifier` pointing to `Verifier` (or import and wrap verify function).
* Use `abi.encodePacked` + hashing to pack public signals into bytes32 for mapping keys if needed.
* Keep `publicSignals` ordering documented in repo README — frontend/off-chain code must match exactly.

---

## Example Solidity Interface Snippet (conceptual)

```solidity
interface ISnarkVerifier {
    function verifyProof(
        uint256[8] calldata proofA, // depends on scheme
        uint256[2] calldata proofB,
        uint256[4] calldata proofC,
        uint256[] calldata publicSignals
    ) external view returns (bool);
}
```

`ZKVerifier` will call this interface and then apply application logic (nullifier check, root check).

---

## Deployment & Operational Notes

* **Dev flow:** use `snarkjs` local to generate a test verifier + test proofs to use in unit tests (Hardhat). Use sample proofs to assert `verifyProof` returns true.
* **Prod flow:** after final circuit, generate final `Verifier.sol` and commit & verify on-chain. If circuit changes (bug fix/upgrade), increment `proofTypeVersion` and deploy new verifier; update `ZKVerifier` via `setVerifierContract`.
* **Frontend:** include helper to request proof generation (or let backend generate proofs for user if necessary). Provide clear UX for proof generation & submission.

---

## Example Events & Error Handling (suggested)

* Use explicit custom errors for gas efficiency:

  * `error ProofInvalid();`
  * `error NullifierAlreadyUsed();`
  * `error RootNotRegistered();`
  * `error VerifierNotSet();`
* Emit `ProofVerified` with minimal data (nullifier, root) so auditors can trace without seeing identity.

---

## Summary — Why ZKVerifier Goes First (before SecurityModule)

* `ZKVerifier` is functionally essential for `VotingEngine` privacy + correctness; VotingEngine logic depends on ZKVerifier to validate anonymous votes.
* `SecurityModule` is cross-cutting (rate-limits, anomaly detection, emergency stop) and should be integrated after verification logic stable.

---


<br>
<br>
<br>


---

# 📜 SecurityModule Contract Documentation

## Overview

`SecurityModule.sol` ka primary role hai poore blockchain voting system ke liye **safety, monitoring aur emergency controls** provide karna.

Ye ek **umbrella protection layer** hai jo:

* Abnormal activities detect karta hai (double votes, voter count mismatch).
* Emergency halt/pause allow karta hai.
* System ke contracts ke beech compliance ensure karta hai (ElectionManager phase checks, AuditTrail record).
* Multiple authorities ko anomaly flag/resolve karne ki power deta hai.

---

## 🛠 Libraries Used

* **OpenZeppelin AccessControl** → Multiple authority roles.
* **OpenZeppelin Pausable** → Emergency stop mechanism.
* **OpenZeppelin ReentrancyGuard** → Safe execution.

---

## 🏗 Contract Structure

### Roles

* `SUPER_ADMIN` → Full control, emergency powers.
* `SECURITY_AUDITOR` → Suspicious activity detect/flag karne ka role.
* `ELECTION_AUTHORITY` → Election lifecycle ke saath integrate karne ka role.

---

### State Variables

* `address public electionManager;` → ElectionManager contract link.

* `address public votingEngine;` → VotingEngine contract link.

* `address public auditTrail;` → AuditTrail contract link (suspicious activity log).

* `bool public globalPaused;` → Emergency flag.

* `uint256 public anomalyCount;` → Total anomalies detected.

* `mapping(bytes32 => bool) public flaggedActivities;`

  * e.g., flagged ke hash store karna (“duplicate voter attempt”, “over-voting detected”).

---

### Events

* `event EmergencyPaused(address triggeredBy);`
* `event EmergencyResumed(address triggeredBy);`
* `event AnomalyDetected(bytes32 indexed anomalyHash, string details, address reportedBy);`
* `event AnomalyResolved(bytes32 indexed anomalyHash, address resolvedBy);`

---

## 🔑 Functions and Purpose

### 1. Constructor

* **Kaam:** ElectionManager, VotingEngine, AuditTrail addresses set karna.
* **Access:** Deployment ke time.

---

### 2. `pauseSystem() external onlyRole(SUPER_ADMIN)`

* **Kaam:** Poore system ko halt karna (VotingEngine, ResultCalculator dependent actions block ho).
* **Emit:** `EmergencyPaused`.

### 3. `resumeSystem() external onlyRole(SUPER_ADMIN)`

* **Kaam:** System ko dobara active karna.
* **Emit:** `EmergencyResumed`.

---

### 4. `reportAnomaly(string calldata details) external onlyRole(SECURITY_AUDITOR)`

* **Kaam:** Security auditor suspicious event detect karke report kar sakta hai.
* **Flow:**

  1. Details ka hash calculate.
  2. `flaggedActivities[hash] = true`.
  3. `AuditTrail.recordAction("AnomalyReported", auditor, details)` call kare.
* **Emit:** `AnomalyDetected`.

---

### 5. `resolveAnomaly(bytes32 anomalyHash) external onlyRole(ELECTION_AUTHORITY)`

* **Kaam:** Election authority anomaly ko resolve/clear kare.
* **Flow:**

  1. `flaggedActivities[anomalyHash] = false`.
  2. Record resolution to AuditTrail.
* **Emit:** `AnomalyResolved`.

---

### 6. `checkSystemHealth() external view returns (bool)`

* **Kaam:**

  * VotingEngine tally vs VoterRegistry total voters mismatch detect karna.
  * Duplicate vote attempt detect karna.
  * Agar sab theek hai → true, else false.

---

### 7. `getAllAnomalies() external view`

* **Kaam:** Public ko allow karna ki wo sabhi flagged anomalies list check kar saken.

---

## ⚙️ Workflow

1. **Normal Operation**

   * VotingEngine aur ResultCalculator kaam karte rehte hai.
   * SecurityModule passive monitoring + anomaly logging maintain karta hai.

2. **Suspicious Activity Detected**

   * Auditor calls `reportAnomaly("More votes than registered voters in Election X")`.
   * Event emit hota hai + AuditTrail record.
   * System flagged hota hai.

3. **Emergency Case**

   * SUPER\_ADMIN calls `pauseSystem()` → VotingEngine aur ResultCalculator dependent actions block ho jate hain.

4. **Resolution**

   * ElectionAuthority investigates → calls `resolveAnomaly()` after verification.
   * System normal resume hota hai via `resumeSystem()`.

---

## ✅ Real-World Analogy

* **SecurityModule** = Election ke time jo “Flying Squad + Observer Committee” hoti hai.
* Ye detect karti hai agar kahin booth capturing ho raha hai, fake votes aa rahe hain, ya counting mismatch ho rahi hai.
* Emergency ke waqt ye election rok bhi sakti hai aur baad me investigation ke baad dobara chalu kara sakti hai.

---

## 🔐 Security Features

* Role-based anomaly handling.
* Immutable logging via AuditTrail.
* Emergency halt to prevent cascade issues.
* Public read-only access to anomalies (transparency).
* Double protection: proactive (health check) + reactive (report anomaly).

---

## 🧪 Testing Checklist

* ✅ Pause/Resume flow blocks/resumes VotingEngine actions.
* ✅ Anomaly report correctly logged to AuditTrail.
* ✅ Only SECURITY\_AUDITOR can report anomalies.
* ✅ Only ELECTION\_AUTHORITY can resolve anomalies.
* ✅ Health check returns false if votes > voters.
* ✅ Multiple anomalies handled correctly (no overwrite).

---

## 🔗 Integration with Other Contracts

* **ElectionManager** → ensure election phase compliance.
* **VotingEngine** → provide tally info for health check.
* **AuditTrail** → store all anomaly events for transparency.
* **ResultCalculator** → block result finalization if anomalies unresolved.

---

## Summary

`SecurityModule.sol` project ka **last line of defense** hai.

* Sabhi contracts ka safety net provide karta hai.
* Election ke process ko protect karta hai abnormal ya malicious actions se.
* Public trust ke liye transparent anomaly reporting karta hai.

---



<br>
<br>
<br>


# 🗳️ Complete Blockchain Voting System – Blueprint

## 📌 Overview

Ye system **end-to-end blockchain-based voting platform** hai jisme transparency, fairness aur privacy maintain hota hai.

Contracts ka structure ekdum **modular** hai:

* Election creation & management
* Voter/Candidate registration
* Vote casting & verification
* Result calculation
* Audit logging
* Privacy preservation (ZKP)
* Security monitoring

---

## 📂 Contracts (9 Modules)

### 1. **ElectionFactory.sol**

* Elections create karne ka main entry point.
* Har election ke liye naya `ElectionManager` deploy karta hai.
* **Roles:** SuperAdmin.
* **Key Functions:** `createElection()`, `getAllElections()`.
* **Analogy:** Election Commission ka central HQ.

---

### 2. **ElectionManager.sol**

* Ek particular election ka lifecycle control karta hai.
* Phases: Created → Registration → Voting → Ended → ResultsDeclared.
* **Roles:** Multiple authorities allowed (SuperOwner + ElectionAuthorities).
* **Key Functions:** `advancePhase()`, `addAuthority()`, `removeAuthority()`.
* **Analogy:** State Election Officer jo ek election supervise karta hai.

---

### 3. **VoterRegistry.sol**

* Voter details store karta hai (Aadhaar hash based).
* Prevents double registration.
* **Key Functions:** `registerVoter()`, `verifyVoter()`, `markVoted()`.
* **Analogy:** Official Voter List.

---

### 4. **CandidateRegistry.sol**

* Candidate nomination aur verification manage karta hai.
* **Key Functions:** `registerCandidate()`, `verifyCandidate()`.
* **Analogy:** Candidate nomination paper filing system.

---

### 5. **VotingEngine.sol**

* Actual vote casting ka contract.
* Integrates with `VoterRegistry`, `CandidateRegistry`, `ZKVerifier`.
* **Key Functions:** `castVote(candidateId)`.
* **Analogy:** Electronic Voting Machine (EVM).

---

### 6. **ResultCalculator.sol**

* Votes tally karta hai aur final results declare karta hai.
* Phase ke saath integrated (only after voting ends).
* **Key Functions:** `calculateResults()`, `getWinner()`.
* **Analogy:** Counting Booth / Returning Officer.

---

### 7. **AuditTrail.sol**

* Election ke sabhi critical actions ka immutable record maintain karta hai.
* **Key Functions:** `recordAction()`, `getLogs()`.
* **Analogy:** Form 20 + official counting sheets.

---

### 8. **ZKVerifier.sol**

* Privacy-preserving proof verification.
* Uses ZK proofs (e.g., Groth16/Plonk) to validate voter eligibility without revealing identity.
* **Key Functions:** `verifyVoteProof()`.
* **Analogy:** Secret ballot check — proof that you’re eligible but without exposing Aadhaar.

---

### 9. **SecurityModule.sol**

* Safety net for anomalies, fraud detection, emergency halt.
* **Key Functions:** `pauseSystem()`, `reportAnomaly()`, `checkSystemHealth()`.
* **Analogy:** Flying Squad + Observers for elections.

---

## 🔗 Interconnection Flow

1. **Election Creation**

   * SuperAdmin → `ElectionFactory.createElection()` → new `ElectionManager`.

2. **Registration Phase**

   * Authorities → `VoterRegistry.registerVoter()` (with Aadhaar hash).
   * Authorities → `CandidateRegistry.registerCandidate()`.

3. **Voting Phase**

   * Voter generates ZK proof off-chain → submits to `VotingEngine.castVote()`.
   * `VotingEngine` → calls `ZKVerifier.verifyVoteProof()`.
   * If valid → vote recorded, `AuditTrail.recordAction("VoteCast")`.

4. **Counting Phase**

   * Authority → `ResultCalculator.calculateResults()`.
   * Result announced → `AuditTrail.recordAction("ResultsDeclared")`.

5. **Audit & Security**

   * Public/Auditors → `AuditTrail.getLogs()`.
   * Security auditors → `SecurityModule.reportAnomaly()`.
   * SuperAdmin → `pauseSystem()` in case of attack.

---

## ⚙️ Lifecycle Diagram (Textual)

```
ElectionFactory
   |
   └── ElectionManager (per election)
           |
           |--- VoterRegistry (who can vote)
           |--- CandidateRegistry (who can contest)
           |
           └── VotingEngine
                  |--- integrates with VoterRegistry (mark voted)
                  |--- integrates with CandidateRegistry (valid candidate check)
                  |--- integrates with ZKVerifier (privacy check)
                  |
                  └── ResultCalculator (final tally)
           
           └── AuditTrail (records every critical event)
           └── SecurityModule (monitors, pauses, anomaly detection)
```

---

## ✅ Real-World Analogy (Simple)

* **ElectionFactory** → Election Commission of India HQ.
* **ElectionManager** → State/Local Election Officer.
* **VoterRegistry** → Electoral rolls.
* **CandidateRegistry** → Candidate nomination system.
* **VotingEngine** → EVM machines.
* **ResultCalculator** → Counting centre.
* **AuditTrail** → Official records/forms.
* **ZKVerifier** → Secret ballot guarantee.
* **SecurityModule** → Flying squads, observers, emergency powers.

---

## 🔐 Security Features

* Role-based access control (multiple authorities).
* Double-vote prevention (nullifiers in ZK).
* Immutable logs (AuditTrail).
* Emergency halt (SecurityModule).
* Phase management (ElectionManager).
* Transparent audit for public trust.

---

## 🧪 Testing Roadmap

* Unit test each contract standalone.
* Integration test ElectionManager with registries.
* End-to-end test →

  * Create election → register voters/candidates → cast votes → verify results → audit logs → pause/resume system.
* Fuzz test VotingEngine + ZKVerifier with invalid proofs.
* Edge case test → no candidates, tie situation, zero votes.

---

## 📊 Deployment Strategy

* Step 1: Deploy `ElectionFactory`.
* Step 2: Deploy `AuditTrail`, `SecurityModule`, `ZKVerifier` once globally.
* Step 3: Each election via `ElectionFactory` creates its own `ElectionManager` + registries + engine + result calculator.
* Step 4: Link Security + Audit + ZK contracts to each manager.

---

## 🎯 Summary

* Total **9 contracts** cover all aspects of real-world election: setup, voting, counting, transparency, privacy, security.
* Modular design → easy to extend for biometrics, advanced ZK circuits, or off-chain oracle integration.
* System ensures **fair + transparent + tamper-proof elections** on blockchain.

---

<br>
<br>
<br>

# 📊 Import Relationship Summary 
```
ElectionFactory
   └── imports ElectionManager

    ElectionManager
      ├── imports VoterRegistry
      ├── imports CandidateRegistry
      ├── imports VotingEngine
      └── imports ResultCalculator

    VotingEngine
      ├── imports VoterRegistry
      ├── imports CandidateRegistry
      └── imports ZKVerifier

    ResultCalculator
      └── imports VotingEngine

    ZKVerifier
      └── imports Verifier (snarkjs generated)

    AuditTrail
      └── standalone (others call it, but don’t import full code)

    SecurityModule
      └── standalone (uses interfaces of VotingEngine, ResultCalculator, AuditTrail)
``
