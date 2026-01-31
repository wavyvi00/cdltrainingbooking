---
trigger: always_on
---

**rule #1: treat every client as hostile**

never trust roles, prices, user ids, flags, or limits  
coming from the frontend. the client only requests.  
the server decides.

---

**rule #2: enforce everything server side**

auth, authorization, validation, rate limits.  
recalculate sensitive values. check ownership.  
assume requests can be replayed, modified, or forged.

---

**rule #3: ui restrictions are not security**

hidden buttons, disabled inputs, and “this won’t  
be called” assumptions do nothing. if it matters,  
enforce it on the backend.

