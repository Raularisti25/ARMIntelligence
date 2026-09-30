# Pi Wake Lab

Experimental, portable extraction of the Raspberry Pi wake lifecycle used by ARM agents.

This keeps the useful mechanism and intentionally leaves out private queues, account routing, credentials, internal hosts, project-specific policy, and the production ARM dependency graph.

## Mechanism

1. `pi-wake.service` keeps the wake daemon alive with systemd and starts it after boot/network availability.
2. `pi-wake.sh` is the small bootstrap that resolves Node and starts the daemon.
3. `wake-loop.mjs` runs exactly one configured wake command at a time.
4. Exit `0` means useful work completed, so the next attempt happens after the short settle window.
5. Exit `75` means nothing should run right now, so the loop uses the longer idle backoff.
6. Other exits are failures and also use the longer backoff.
7. On shutdown, the daemon stops starting new work and gives the active child a grace window before sending SIGTERM.
8. A process lock prevents two wake loops from owning the same state directory.
9. `~/.arm-intelligence/pi-wake/health.json` records the current state and most recent outcome.

The important design property is that compute/eligibility can decide whether work runs. The clock only decides when to try again.

## Configure a wake target

Create `~/.config/arm-intelligence/pi-wake.env`:

```bash
ARM_LAB_WAKE_PROGRAM=/usr/bin/node
ARM_LAB_WAKE_ARGS_JSON=["/home/me/ARMIntelligence/lab/my-agent/wake.mjs"]
```

The supplied service reads that optional environment file automatically.

The wake target owns selection, model choice, auth, task execution, and its own proof of success. This LAB wrapper only owns lifecycle and retry cadence.

### Child exit contract

- `0`: useful wake work completed
- `75`: deferred, idle, no eligible work, or no capacity
- anything else: failure

## Install on a Pi

```bash
chmod +x ~/ARMIntelligence/lab/pi-wake/pi-wake.sh
mkdir -p ~/.config/systemd/user
cp ~/ARMIntelligence/lab/pi-wake/pi-wake.service ~/.config/systemd/user/arm-intelligence-pi-wake.service
systemctl --user daemon-reload
systemctl --user enable --now arm-intelligence-pi-wake.service
```

For unattended operation after logout, enable user lingering once:

```bash
loginctl enable-linger "$USER"
```

Inspect it with:

```bash
systemctl --user status arm-intelligence-pi-wake.service
journalctl --user -u arm-intelligence-pi-wake.service -f
cat ~/.arm-intelligence/pi-wake/health.json
```

## Provenance

The extraction follows the production ARM Pi pattern: a systemd user service with restart semantics, a tiny shell bootstrap, a long-lived wake loop, short settle after productive work, longer backoff after idle/deferred work, single-owner locking, graceful shutdown, and a hard systemd stop ceiling.

The production implementation has substantially more policy and routing logic. That code stays in the private ARM system. This folder is the reusable mechanism for experiments in ARMIntelligence.
