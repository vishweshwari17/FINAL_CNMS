import asyncio
import os
import sys

# Set up the path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models import db
from datetime import timedelta

async def run_retro_correlation():
    await db.init_pool()
    
    # Process SPIC-NMS alarms (where lnms_node_id='LNMS-COMPANY-01')
    # and maybe LNMS-LOCAL-01 too (the user mentioned both)
    
    # We will get all tickets and sort them by device_name and created_at
    print("Fetching existing tickets for analysis...")
    tickets = await db.fetchall("""
        SELECT id, alarm_uid, device_name, created_at, title 
        FROM tickets 
        ORDER BY device_name ASC, created_at ASC
    """)
    
    print(f"Found {len(tickets)} total tickets.")
    
    correlated_count = 0
    # Group by device_name
    from collections import defaultdict
    device_tickets = defaultdict(list)
    for t in tickets:
        if t["device_name"]:
            device_tickets[t["device_name"]].append(t)
            
    for device, t_list in device_tickets.items():
        # Iterate over tickets for this device, look for clusters within 15 minutes
        for i in range(len(t_list)):
            t1 = t_list[i]
            
            # Check for a parent
            # A parent is the earliest ticket in the 15 min window before t1
            # To simplify, we look backwards up to 15 mins
            parent = None
            for j in range(i-1, -1, -1):
                t2 = t_list[j]
                if t1["created_at"] - t2["created_at"] <= timedelta(minutes=15):
                    parent = t2
                else:
                    break # Since it's sorted by time, going further back will be > 15 mins
            
            if parent:
                # t1 is correlated to parent
                corr_id = f"CORR-TKT-{parent['id']}"
                parent_uid = parent["alarm_uid"]
                child_uid = t1["alarm_uid"]
                
                # Update both parent and child
                await db.execute(
                    "UPDATE alarms SET correlation_id = %s WHERE alarm_uid IN (%s, %s)",
                    (corr_id, child_uid, parent_uid)
                )
                correlated_count += 1
                print(f"Correlated '{t1['title']}' to parent '{parent['title']}' on {device}")
    
    print(f"\nCategorization complete! {correlated_count} alarms correlated.")
    await db.close_pool()

if __name__ == "__main__":
    asyncio.run(run_retro_correlation())
