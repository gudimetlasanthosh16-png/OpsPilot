import os
import json
import time
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.text import Text
from rich.markdown import Markdown
from rich.table import Table
from rich.align import Align
from fpdf import FPDF
from opspilot.agent import OpsPilotAgent

# Load environment variables
load_dotenv()

console = Console()

class RichCLI:
    def __init__(self):
        self.console = Console()
        
    def print_header(self):
        self.console.clear()
        title = Align.center(Text("🚀 OpsPilot Autonomous Incident Investigator", style="bold white on blue", justify="center"))
        self.console.print(Panel(title, border_style="blue", padding=(1, 2)))
        self.console.print("\n")
        
    def on_thought(self, thought: str):
        if thought.strip():
            self.console.print(f"[bold cyan]🧠 OpsPilot Thinking...[/bold cyan]")
            self.console.print(Panel(f"[italic]{thought}[/italic]", border_style="cyan", padding=(1, 2)))
            time.sleep(0.5)

    def on_tool_call(self, tool_name: str, args: dict):
        table = Table(show_header=True, header_style="bold yellow", border_style="yellow", expand=True)
        table.add_column("🛠️ Executing Tool", style="bold white")
        table.add_column("Arguments", style="dim")
        
        args_str = json.dumps(args, indent=2)
        table.add_row(tool_name, args_str)
        self.console.print(table)
        time.sleep(0.5)

    def on_observation(self, result: str):
        truncated_result = result[:800] + ("..." if len(result) > 800 else "")
        self.console.print(Panel(truncated_result, title="[bold green]👀 Observation[/bold green]", border_style="green", padding=(1, 2)))
        self.console.print("\n")
        time.sleep(0.5)

def main():
    cli = RichCLI()
    cli.print_header()
    
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        console.print(Panel("[bold red]Error:[/bold red] GROQ_API_KEY is missing or invalid in .env file.\n\nPlease update the .env file with a valid Groq API Key.", border_style="red"))
        return
        
    agent = OpsPilotAgent(api_key=api_key)
    
    console.print("[dim]Type 'exit' or 'quit' to exit the application.[/dim]")
    
    while True:
        incident = Prompt.ask("\n[bold magenta]💬 You[/bold magenta]")
        
        if not incident or incident.lower() in ['exit', 'quit']:
            console.print("[dim]Exiting OpsPilot.[/dim]")
            break
            
        callbacks = {
            "on_thought": cli.on_thought,
            "on_tool_call": cli.on_tool_call,
            "on_observation": cli.on_observation
        }
        
        try:
            final_state = agent.run(incident, callbacks=callbacks)
            
            if final_state.get("is_resolved") and final_state.get("final_report"):
                console.print("\n" + "=" * 60)
                console.print(Align.center("[bold blue]✅ Investigation Complete[/bold blue]"))
                console.print("=" * 60 + "\n")
                try:
                    report_data = json.loads(final_state["final_report"]).get("report", {})
                    
                    report_text = f"LIKELY ROOT CAUSE\n{report_data.get('root_cause', 'N/A')}\n\n"
                    report_text += f"Confidence: {report_data.get('confidence', 'N/A')}%\n\n"
                    report_text += "Evidence:\n"
                    
                    for ev in report_data.get('evidence', []):
                        report_text += f"• {ev}\n"
                        
                    report_text += f"\nRecommended action: {report_data.get('recommended_action', 'N/A')}\n"
                    if "rollback" in report_data.get('recommended_action', '').lower():
                        report_text += "Human approval required before rollback.\n"
                    
                    if report_data.get('summary'):
                        report_text += f"\nSummary:\n{report_data.get('summary')}\n"
                    
                    if report_data.get('recommendations'):
                        report_text += "\nRecommendations / Changes to Implement:\n"
                        for rec in report_data.get('recommendations'):
                            report_text += f"• {rec}\n"
                    
                    try:
                        pdf = FPDF()
                        pdf.add_page()
                        pdf.set_font("Helvetica", size=12)
                        # Replace bullets to avoid latin-1 encoding errors in fpdf default fonts
                        pdf_safe_text = report_text.replace('•', '-')
                        pdf.multi_cell(0, 10, text=pdf_safe_text)
                        
                        report_filename = f"incident_report_{int(time.time())}.pdf"
                        report_path = os.path.abspath(report_filename)
                        pdf.output(report_path)
                        
                        pdf_link = f"file:///{report_path.replace(os.sep, '/')}"
                        report_text += f"\n[📄 PDF Report]({pdf_link})\n"
                    except Exception as pdf_e:
                        pass
                    
                    console.print(Panel(report_text, title="Final Response", border_style="green", padding=(1, 2)))
                    
                except Exception:
                    console.print(Panel(final_state["final_report"], title="[bold green]Final Report[/bold green]", border_style="green"))
                    
            elif final_state.get("needs_approval"):
                console.print(Panel("[bold red]🚨 HIGH IMPACT ACTION PENDING APPROVAL 🚨[/bold red]", border_style="red", expand=False))
                action = final_state["pending_action"]
                
                table = Table(show_header=True, header_style="bold red", border_style="red")
                table.add_column("Requested Action")
                table.add_column("Arguments")
                table.add_row(action['tool'], json.dumps(action['args'], indent=2))
                console.print(table)
                
                approval = Prompt.ask("\n[bold yellow]Do you approve this action?[/bold yellow]", choices=["y", "n"], default="n")
                if approval == "y":
                    console.print("[bold green]✔ Action approved. Executing...[/bold green]")
                    from opspilot.tool_registry import registry
                    res = registry.execute(action['tool'], **action['args'])
                    console.print(Panel(res, title="[bold green]Execution Result[/bold green]", border_style="green"))
                    agent.state["observations"].append(f"Result from {action['tool']}: {res}")
                    agent.state["messages"].append({"role": "user", "content": f"The rollback was approved and returned: {res}. What is the next step?"})
                else:
                    console.print("[bold red]✖ Action rejected by user.[/bold red]")
                    agent.state["messages"].append({"role": "user", "content": "The rollback was REJECTED by the user. Please advise."})
                
                # Reset approval state after handling
                agent.state["needs_approval"] = False
                agent.state["pending_action"] = None
                    
            else:
                # Continuous chat text response
                console.print(Panel(final_state.get("final_report", ""), title="[bold cyan]OpsPilot[/bold cyan]", border_style="cyan"))
                
        except Exception as e:
            console.print(Panel(f"[bold red]An error occurred during execution:[/bold red]\n{str(e)}", border_style="red"))

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n[dim]Exiting OpsPilot (Ctrl+C).[/dim]")
