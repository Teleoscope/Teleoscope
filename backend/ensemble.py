# Copy this cell wherever you want without thinking 👌

# (I sacrifice readability and devise ways to make memory errors less likely to occur.)
import numpy as np
import pandas as pd
from tqdm import trange
from tqdm import tqdm
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans
from collections import defaultdict
from scipy.sparse import csr_matrix
from sklearn.mixture import GaussianMixture
from sklearn.metrics import adjusted_rand_score

def clustering_ensemble(clusters_list, weights = None, threshold = 0.5, size_max = 18000, cls_num_min = 7):
    """
    Parameters: 
                clusters_list:  List of numpy arrays, representing the cluster_id of each data point
                weights:        List representing the voting weight, for example = [0.5, 0.5]. default None (uses uniform weights)
                threshold:      float(0.0, 1.0), the threshold for determining an edge in the sparse matrix, default 0.5
                size_max:       The maximum size of a cluster, default 18000
                cls_num_min:    The minimum number of clusters, default 7
    Returns: 
                clusters_final: An ensemble of the clustering algorithms predictions.
    weights: Where the ensemble results are the same as before the ensemble, when it does not work, tweaking here may work.
    threshold: The larger the larger, the faster; If you don't have enough memory, try making it bigger.
    """
    # zip same cluster.
    cls_tup_list = []
    for cls_tup in zip(*clusters_list):
        cls_tup_list.append(cls_tup)
    zipper = {x: i for i, x in enumerate(sorted(set(cls_tup_list)))}
    zipped_list = [zipper[x] for x in cls_tup_list]
    unzipper = defaultdict(set)
    for idx, cls_tup in enumerate(cls_tup_list):
        zipped = zipper[cls_tup]
        unzipper[zipped].add(idx)
    comp_clusters_list = [[-1]*len(zipper) for _ in range(len(clusters_list))]
    node_end = len(comp_clusters_list[0])
    print(node_end)
    for clusters, comp_clusters in zip(clusters_list, comp_clusters_list):
        for i, cluster_i in enumerate(clusters):
                value = zipped_list[i]
                comp_clusters[value] = cluster_i             
    # calc adjacency matrix(sparse). and calc score(weighted average)
    # memory error. OMG. I created my own simple. I believe that the reduction in space computation by creating the system by oneself is more advantageous than the constant-doubling speed-up by numpy.
    def create_sparse_matrix(clusters):
        sparse = defaultdict(lambda :defaultdict(int))  # High speed by utilizing cache memory. sparse[(node1, node2)] is slow.
        # if clusters[node1] == clusters[node2] then sparse[node1][node2] = 1
        cluster_idx_of = defaultdict(set)  # cls_inx_of[clster] = set(idx)
        for idx, cluster in enumerate(clusters):
            cluster_idx_of[cluster].add(idx)
        for cluster, idx_list in cluster_idx_of.items():
            for node1 in idx_list:
                for node2 in idx_list:
                    sparse[node1][node2] = 1
        return sparse
    sparse_matrix_list = [create_sparse_matrix(comp_clusters) for comp_clusters in tqdm(comp_clusters_list)]
    if weights is None: weights = [1 / len(sparse_matrix_list) for i in range(len(sparse_matrix_list))]
    weights = np.asarray(weights) / np.sum(weights)
    # Define edge_list (val, node1, node2).
    # However, if you do it normally, there is not enough memory because sparse_matrix_mean is not sparse. By processing every node1, the amount of space calculation is greatly reduced.
    edge_list = []  # [(val, node1, node2), ...]
    for node1 in trange(node_end):
        sparse_matrix_mean = defaultdict(int)
        for sparce_matrix, weight in zip(sparse_matrix_list, weights):
            col = sparce_matrix[node1]
            for node2, val in col.items():
                sparse_matrix_mean[node2] += val*weight
            for node2, val in sparse_matrix_mean.items():
                if val < threshold or node1 >= node2:
                    continue
                edge_list.append((val, node1, node2))
    edge_list.sort(reverse=True)
    class DSU:
        def __init__(self, node_end, unzipper):
            self.par = [i for i in range(node_end)]
            self.siz = [len(unzipper[i]) for i in range(node_end)]
            self.cls_num = node_end  # To use the cls_num variable, we declared this class
        def find(self, x):
            if self.par[x] == x: return x
            self.par[x] = self.find(self.par[x])
            return self.par[x]
        def union(self, x, y):
            x = self.find(x)
            y = self.find(y)
            if x == y:
                return
            if self.siz[x] > self.siz[y]: x, y = y, x
            self.par[x] = y
            self.siz[y] += self.siz[x]
            self.cls_num -= 1
        def get_siz(self, x):
            x = self.find(x)
            return self.siz[x]
    dsu = DSU(node_end, unzipper)
    for w, fr, to in edge_list:
        if (dsu.get_siz(fr)+dsu.get_siz(to)) > size_max: continue
        dsu.union(fr, to)
        if dsu.cls_num <= cls_num_min:
            print("number of clusters reaches cls_num_min: {}".format(cls_num_min), " break.")
            break
    # Unzip the zipped array.
    clusters_final = [0]*len(clusters_list[0])    
    for node in range(node_end):
        cluster_id = dsu.find(node)
        idx_list = unzipper[node]
        for idx in idx_list:
            clusters_final[idx] = cluster_id
    # Renumbered for easier viewing.
    zipper = {x: i for i, x in enumerate(sorted(set(clusters_final)))}
    clusters_final = [zipper[x] for x in clusters_final]            
    return clusters_final

# Not relevant for ensembles, but if you want to check the result, copy the following as well
# https://www.kaggle.com/code/ambrosm/tpsjul22-gaussian-mixture-cluster-analysis
def compare_clusterings(y1, y2, title=''):
    """Show the adjusted rand score and plot the two clusterings in color"""
    ars = adjusted_rand_score(y1, y2)
    n1 = y1.max() + 1
    n2 = y2.max() + 1
    argsort = np.argsort(y1*100 + y2) if n1 >= n2 else np.argsort(y2*100 + y1)
    plt.figure(figsize=(16, 0.5))
    for i in range(6, 11):
        plt.scatter(np.arange(len(y1)), np.full_like(y1, i), c=y1[argsort], s=1, cmap='tab10')
    for i in range(5):
        plt.scatter(np.arange(len(y2)), np.full_like(y2, i), c=y2[argsort], s=1, cmap='tab10')
    plt.gca().axis('off')
    plt.title(f'{title}\nAdjusted Rand score: {ars:.5f}')
    plt.savefig(title + '.png', bbox_inches='tight')
    plt.show()