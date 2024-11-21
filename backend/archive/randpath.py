import random
import argparse

def generate_no_reverse_path(start_x=100, start_y=100, steps=10, min_step_size=10, max_step_size=50):
    """
    Generate a random SVG path with only right-angle turns (no 180° turns).
    
    Args:
        start_x (int): Starting x-coordinate.
        start_y (int): Starting y-coordinate.
        steps (int): Number of steps in the path.
        min_step_size (int): Minimum step size.
        max_step_size (int): Maximum step size.
        
    Returns:
        str: SVG path string.
    """
    current_x, current_y = start_x, start_y
    visited = {(current_x, current_y)}  # Track visited points to avoid overlaps
    path = f"M{current_x},{current_y}"  # Start the path
    last_direction = None
    directions = {"H": ["V"], "V": ["H"]}  # Allowed turns for each direction

    for _ in range(steps):
        # Try random moves until a valid one is found
        for _ in range(100):  # Limit retries to prevent infinite loops
            direction = random.choice(directions[last_direction] if last_direction else ["H", "V"])
            step = random.randint(min_step_size, max_step_size) * random.choice([-1, 1])
            new_x, new_y = current_x, current_y

            if direction == "H":
                new_x += step
            elif direction == "V":
                new_y += step

            if (new_x, new_y) not in visited:  # Ensure no overlap
                visited.add((new_x, new_y))
                current_x, current_y = new_x, new_y
                path += f" {direction}{current_x if direction == 'H' else current_y}"
                last_direction = direction
                break
        else:
            print("Could not find a non-overlapping move. Stopping early.")
            break

    return path

def main():
    parser = argparse.ArgumentParser(description="Generate a non-overlapping random SVG path with right-angle turns (no 180° turns).")
    parser.add_argument("--output", type=str, required=True, help="Output file name for the SVG.")
    parser.add_argument("--start_x", type=int, default=100, help="Starting x-coordinate.")
    parser.add_argument("--start_y", type=int, default=100, help="Starting y-coordinate.")
    parser.add_argument("--steps", type=int, default=10, help="Number of steps in the path.")
    parser.add_argument("--min_step_size", type=int, default=10, help="Minimum step size.")
    parser.add_argument("--max_step_size", type=int, default=50, help="Maximum step size.")

    args = parser.parse_args()

    # Generate the random path
    random_path = generate_no_reverse_path(
        start_x=args.start_x,
        start_y=args.start_y,
        steps=args.steps,
        min_step_size=args.min_step_size,
        max_step_size=args.max_step_size
    )

    # Create the SVG content
    svg_content = f"""
    <svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
        <path d="{random_path}" stroke="black" fill="none" stroke-width="2"/>
    </svg>
    """

    # Save to file
    with open(args.output, "w") as f:
        f.write(svg_content)
    print(f"SVG path saved to {args.output}")

if __name__ == "__main__":
    main()
