import argparse
import os
from lxml import etree

def process_element(elem):
    # Process the element here
    print(elem.tag, elem.text)
    # Clear processed elements to save memory
    elem.clear()
    while elem.getprevious() is not None:
        del elem.getparent()[0]

def parse_xml(file_path, target_tag, checkpoint_file):
    last_processed = 0
    if os.path.exists(checkpoint_file):
        with open(checkpoint_file, 'r') as f:
            last_processed = int(f.read())

    processed = 0
    context = etree.iterparse(file_path, events=('end',), tag=target_tag)
    for event, elem in context:
        if processed >= last_processed:
            process_element(elem)
            last_processed = processed
            with open(checkpoint_file, 'w') as f:
                f.write(str(processed))
        processed += 1
    del context

def main():
    parser = argparse.ArgumentParser(description="XML Parser for Large Files with Checkpointing")
    parser.add_argument("--file", help="Path to the XML file")
    parser.add_argument("--tag", help="Target tag to process in the XML file")
    parser.add_argument("--checkpoint", default="checkpoint.txt", help="Checkpoint file name")
    
    args = parser.parse_args()

    parse_xml(args.file, args.tag, args.checkpoint)

if __name__ == "__main__":
    main()
