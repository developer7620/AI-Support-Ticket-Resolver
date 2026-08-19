# # AI Support Ticket Resolver

An AI-powered logistics customer support system built for an **Applied AI Engineer – Customer Experience** use case.

The system takes a customer support ticket, understands the issue using Gemini, retrieves authoritative shipment information through backend tools, retrieves the applicable support policy, generates an evidence-based diagnosis, and then makes a **backend-controlled decision** to either automatically resolve the ticket or escalate it to a human agent.

> **Core principle:** The LLM proposes. The backend owns facts, tools, and safety decisions.

---

## 🎯 Problem

Logistics customer-support teams handle large volumes of repetitive tickets such as:

- Where is my shipment?

- Why is my delivery delayed?

- Why did the system mark my shipment as delivered?

- I did not receive my delivered package.

- My shipment has stopped receiving scans.

- A delivery attempt failed.

- Can I cancel my shipment?

A naive AI chatbot can:

- hallucinate shipment information,

- invent ETAs,

- incorrectly claim that a package was delivered,

- resolve cases that require human investigation.

This project demonstrates a safer approach where AI is used for reasoning and automation, while the backend remains the source of truth for shipment data and resolution decisions.

---

# 🚀 Key Features

- Gemini-powered ticket classification

- Structured JSON output using schemas

- Gemini function calling / tool use

- Backend-controlled shipment tools

- Shipment event timeline retrieval

- Support-policy retrieval

- Evidence-based AI diagnosis

- Confidence scoring

- Deterministic backend safety gates

- Automatic ticket resolution

- Human-in-the-loop escalation

- Customer-facing response generation

- Demo provider for reliable offline demonstrations

- Simulated API failures for resilience testing

- React dashboard for ticket inspection

- Automated backend tests

---

# 🏗️ Architecture

```text

                     Customer

                        |

                        v

                React + Vite UI

                        |

                        | POST /api/tickets

                        v

                  Express API

                        |

                        v

              Ticket Processing Workflow

                        |

              +---------+---------+

              |                   |

              v                   v

        Gemini Provider       Demo Provider

              |

              v

      Structured Classification

              |

              v

       Gemini Tool Calling

              |

       +------+------+------+

       |             |      |

       v             v      v

 Shipment Details  Events  Policy Search

       |             |      |

       +------+------+------+

              |

              v

        AI Diagnosis

              |

              v

      Backend Safety Gate

              |

        +-----+------+

        |            |

        v            v

 AUTO_RESOLVED    ESCALATED

                     |

                     v

              Human Agent Review