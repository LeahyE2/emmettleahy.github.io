> **Sample entry.** Replace this with your own project. For group work, describe your own contribution, credit your teammates by name only if they agree, and check your course rules before publishing coursework.

## Summary

A two-site enterprise network designed in Cisco Packet Tracer: a head office and a branch, each with separate VLANs, internet access through NAT, and an encrypted site-to-site VPN between them. The goal was a design that is easy to explain and easy to defend.

## Requirements

- Separate staff, guest and management traffic
- Shared services reachable from the head office only
- Internet access for every site through a single public address
- Encrypted traffic between the two sites

## Design

```
                  Internet
                     |
          [Head office router] ==== VPN ==== [Branch router]
                     |                              |
              [Core switch]                  [Branch switch]
              /     |     \                    /         \
         VLAN 10  VLAN 20  VLAN 99        VLAN 10      VLAN 20
         Staff    Guest    Management     Staff        Guest
```

| VLAN | Name | Purpose | Notes |
| --- | --- | --- | --- |
| 10 | Staff | Employee devices | Can reach shared services |
| 20 | Guest | Visitor devices | Internet only |
| 99 | Management | Switch and router administration | Reachable only from an admin host |

Keeping guest traffic on its own VLAN with no route to internal services is the simplest control in the design, and probably the most valuable.

## Key configuration

Defining a VLAN and trunking it to another switch:

```
vlan 10
 name STAFF
!
interface GigabitEthernet0/1
 switchport mode trunk
 switchport trunk allowed vlan 10,20,99
```

Sharing one public address with NAT overload:

```
access-list 1 permit 192.168.10.0 0.0.0.255
ip nat inside source list 1 interface GigabitEthernet0/0 overload
```

## Testing

- Confirmed devices in each VLAN receive an address and reach their gateway
- Confirmed guest devices **cannot** reach staff or management addresses
- Confirmed traffic between the sites is carried through the VPN tunnel
- Recorded each test with the command used and the result

> **Why the negative tests matter.** Showing that something works is easy. Showing that something is blocked is what proves the control exists.

## Security improvements I would make next

- Disable unused switch ports and place them in an unused VLAN
- Replace default administrative access with named accounts and SSH only
- Add logging to a central server so changes and failures can be reviewed

## What I learned

- A clear addressing plan on paper first saves hours of debugging later.
- Documenting the design, the tests and the known gaps is as much a part of the work as the configuration itself.
