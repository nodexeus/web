'use client';

import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';

const faqs = [
  {
    title: 'Who is SQD Hosting?',
    text: 'SQD Hosting is a Web3 infrastructure company allowing node operators to deploy and manage blockchain nodes on any infrastructure anywhere in the world. Because our platform is designed from the ground up specifically to support blockchain nodes, we are able to lower operational costs by up to 80% over traditional cloud providers. Our platform allows customers to run their nodes on bare metal servers, while giving them a cloud-like convenience without the cloud-like cost. Not to mention, our platform takes care of just about everything, making sure every node remains updated, online, and running at peak performance. We operate under the name Nodexeus Technologies.',
  },
  {
    title: 'Why SQD Hosting/Nodexeus?',
    text: 'We have been involved with the SQD project since the beginning and have been working with the team to help them deploy and manage their nodes. We have grown to become the single largest sqd worker node hosting platform due to our high performant, cost effective, and easy to use platform.',
  },
  {
    title: 'If I stake a SQD node, what is the lock-up period?',
    text: 'The lock-up period for SQD staking is 50,000 L1 blocks, which is approx. 1 week.',
  },
  {
    title: 'What is the minimum amount of SQD needed to stake?',
    text: 'The minimum amount of SQD needed to stake a node is 100,000 SQD. If you would still like to participate in the SQD network but do not have 100,000 SQD, you can delegate to nodes and that can be as few as 1 SQD.',
  },
  {
    title: 'What technology does SQD Hosting use?',
    text: 'We are using a custom technology developed by the team at BlockJoy called Blockvisor. Blockvisor enables us to run nodes on any infrastructure while maximizing performance, efficiency, and manageability at scale.',
  },
  {
    title: 'How Does Blockvisor Work?',
    text: 'Blockvisor acts as an orchestration layer allowing customer nodes to run on bare metal servers in any data center or location the customer chooses. Customers can optionally run fully managed blockchain nodes and servers within Nodexeus\u2019 data centers for convenience, however our services are designed to allow customers to run on any server and remain in full control of their own compute resources.',
  },
  {
    title: 'How is Blockvisor Different?',
    text: 'We don\u2019t know about you, but we\u2019ve experienced and have seen a tremendous increase in the number of complaints regarding cloud costs. We and many others just don\u2019t believe that the ever increasing cloud costs are worth it anymore. Traditional cloud providers came about to make it easier for developers to deploy and scale fast growing Web 2.0 applications. These systems make heavy use of virtualization, containerized services (e.g., docker & kubernetes). Typically, web services are designed to be \u201Cstateless\u201D meaning that individual web servers can be started and killed without any kind of impact. These cloud infrastructures are designed more for horizontal scaling and are priced accordingly. However for Web3, blockchain nodes are very much stateful. They often require dedicated resources and are better suited for infrastructure that supports vertical scaling. In our opinion, heavy virtualized CPUs, virtualized networking layers, and virtualized storage systems all add latency that aren\u2019t great for typical blockchain nodes. Furthermore, blockchain nodes, especially ones that are participating in Proof of Stake operations need even more focus on performance and reliability. Blockvisor\u2019s platform has been designed from the ground up specifically for the use cases of Web3 infrastructure. Because of this, our UIs and APIs are far simpler to use, offer incredibly fast time-to-market for new protocols, and the costs are drastically reduced over traditional cloud providers.',
  },
];

function FaqItem({
  title,
  text,
  isOpen,
  onToggle,
}: {
  title: string;
  text: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/50"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{title}</span>
      </button>
      {isOpen && (
        <div className="border-t border-border/50 px-5 py-4 pl-12">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {text}
          </p>
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Find answers to common questions about our platform and services.
          </p>
        </div>
      </div>

      {/* FAQ items */}
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <FaqItem
            key={faq.title}
            title={faq.title}
            text={faq.text}
            isOpen={openItems.has(index)}
            onToggle={() => toggleItem(index)}
          />
        ))}
      </div>
    </div>
  );
}
